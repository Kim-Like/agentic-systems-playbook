/**
 * The demo-to-production gap, two guards as a runnable reference.
 *
 *   1. InputBoundary  : validate shape/type/range BEFORE the agent runs, and
 *                       reject anything unexpected loudly (never a silent
 *                       best-effort on an input the agent was not built for).
 *   2. DeviationMonitor: track a rolling baseline of an output signal and FLAG
 *                       outputs that stray past a threshold (catches the
 *                       "shape fine, value silently wrong" failure).
 *
 * Written from scratch, no dependencies. Run it:  npx tsx deviation-guard.ts
 */

// ---------------------------------------------------------------------------
// 1. Input boundary
// ---------------------------------------------------------------------------

/** A field check returns null when ok, or a human-readable reason when not. */
type FieldCheck = (value: unknown) => string | null;

const required: FieldCheck = (v) =>
  v === undefined || v === null ? "missing" : null;

const isNumber: FieldCheck = (v) =>
  typeof v === "number" && Number.isFinite(v) ? null : `not a finite number (got ${typeof v})`;

const nonEmptyString: FieldCheck = (v) =>
  typeof v === "string" && v.trim().length > 0 ? null : "not a non-empty string";

const inRange =
  (min: number, max: number): FieldCheck =>
  (v) =>
    typeof v === "number" && v >= min && v <= max ? null : `out of range [${min}, ${max}]`;

/** Compose checks: all must pass, first failure wins. */
const all =
  (...checks: FieldCheck[]): FieldCheck =>
  (v) => {
    for (const c of checks) {
      const r = c(v);
      if (r) return r;
    }
    return null;
  };

type Spec = Record<string, FieldCheck>;
type BoundaryResult<T> =
  | { ok: true; value: T }
  | { ok: false; rejected: Record<string, string> };

/**
 * Validate a record against a spec BEFORE the agent sees it. An input that does
 * not match is REJECTED with reasons, not handed to the agent to improvise on.
 * Unknown extra keys are reported too (a differently-shaped input is exactly the
 * production surprise a demo never has).
 */
class InputBoundary<T extends Record<string, unknown>> {
  constructor(private readonly spec: Spec) {}

  check(input: unknown): BoundaryResult<T> {
    const rejected: Record<string, string> = {};
    if (typeof input !== "object" || input === null) {
      return { ok: false, rejected: { _input: "not an object" } };
    }
    const obj = input as Record<string, unknown>;
    for (const [field, check] of Object.entries(this.spec)) {
      const reason = check(obj[field]);
      if (reason) rejected[field] = reason;
    }
    for (const key of Object.keys(obj)) {
      if (!(key in this.spec)) rejected[key] = "unexpected field (not in spec)";
    }
    return Object.keys(rejected).length === 0
      ? { ok: true, value: obj as T }
      : { ok: false, rejected };
  }
}

// ---------------------------------------------------------------------------
// 2. Deviation monitor
// ---------------------------------------------------------------------------

interface Observation {
  value: number;
  flagged: boolean;
  baseline: number | null;
  /** Relative deviation from the rolling mean, when a baseline exists. */
  deviation: number | null;
}

/**
 * A rolling-baseline monitor for one output signal. After a warm-up of
 * `minSamples`, it flags any value whose relative distance from the rolling mean
 * exceeds `threshold` (e.g. 0.5 = 50%). A flag means "look", not "wrong".
 * Flagged values are excluded from the baseline so one outlier cannot poison it.
 */
class DeviationMonitor {
  private window: number[] = [];
  constructor(
    private readonly opts: { windowSize: number; minSamples: number; threshold: number }
  ) {}

  observe(value: number): Observation {
    const baseline =
      this.window.length >= this.opts.minSamples
        ? this.window.reduce((a, b) => a + b, 0) / this.window.length
        : null;

    let flagged = false;
    let deviation: number | null = null;
    if (baseline !== null) {
      deviation = Math.abs(value - baseline) / (Math.abs(baseline) || 1);
      flagged = deviation > this.opts.threshold;
    }

    // Only trusted (non-flagged) values feed the baseline.
    if (!flagged) {
      this.window.push(value);
      if (this.window.length > this.opts.windowSize) this.window.shift();
    }
    return { value, flagged, baseline, deviation };
  }
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

interface Order {
  id: string;
  quantity: number;
  unitPrice: number;
}

function demo(): void {
  // The boundary the demo never had: every input is validated before the agent.
  const boundary = new InputBoundary<Order>({
    id: all(required, nonEmptyString),
    quantity: all(required, isNumber, inRange(1, 10_000)),
    unitPrice: all(required, isNumber, inRange(0, 1_000_000)),
  });

  const monitor = new DeviationMonitor({ windowSize: 20, minSamples: 5, threshold: 0.5 });

  // A toy "agent": computes an order total. Stands in for any agent that turns
  // a validated input into an output worth watching.
  const agent = (o: Order): number => o.quantity * o.unitPrice;

  // 1. A run of normal production inputs. Boundary passes; monitor learns the baseline.
  console.log("1. Normal inputs (boundary passes, monitor warms up):");
  const normal: Order[] = Array.from({ length: 7 }, (_, i) => ({
    id: `ord_${i + 1}`,
    quantity: 10 + (i % 3),
    unitPrice: 19.99,
  }));
  for (const input of normal) {
    const checked = boundary.check(input);
    if (!checked.ok) continue;
    const out = monitor.observe(agent(checked.value));
    console.log(
      `   ${input.id}: total=${out.value.toFixed(2)} flagged=${out.flagged}` +
        (out.baseline ? ` (baseline ${out.baseline.toFixed(2)})` : " (warming up)")
    );
  }

  // 2. A malformed input: quantity arrived as a string. Caught at the boundary,
  //    BEFORE the agent runs. The agent never improvises on it.
  console.log("\n2. Malformed input (quantity is a string):");
  const bad = { id: "ord_8", quantity: "12", unitPrice: 19.99 } as unknown;
  const checkedBad = boundary.check(bad);
  console.log(
    checkedBad.ok
      ? "   passed (BUG)"
      : `   REJECTED at boundary: ${JSON.stringify(checkedBad.rejected)} -> routed to a human, agent never ran`
  );

  // 3. A well-shaped input that yields a silently-wrong value: a unit price that
  //    slipped to an old default. Shape is valid, so the boundary passes it. The
  //    deviation monitor catches the drift the boundary cannot.
  console.log("\n3. Well-shaped but drifted output (unit price defaulted to 1.99):");
  const drifted: Order = { id: "ord_9", quantity: 11, unitPrice: 1.99 };
  const checkedDrift = boundary.check(drifted);
  if (checkedDrift.ok) {
    const out = monitor.observe(agent(checkedDrift.value));
    console.log(
      `   ${drifted.id}: total=${out.value.toFixed(2)} baseline=${out.baseline?.toFixed(2)} ` +
        `deviation=${((out.deviation ?? 0) * 100).toFixed(0)}% flagged=${out.flagged} ` +
        `-> ${out.flagged ? "queued for review the SAME DAY" : "slipped through"}`
    );
  }

  console.log(
    "\nThe boundary caught the malformed input; the monitor caught the plausible-but-wrong one. " +
      "Neither needed the model to police itself."
  );
}

demo();

export { InputBoundary, DeviationMonitor, all, required, isNumber, nonEmptyString, inRange };
