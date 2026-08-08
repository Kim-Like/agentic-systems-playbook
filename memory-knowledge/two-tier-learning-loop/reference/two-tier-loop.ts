/**
 * Two-tier learning loop, a runnable reference.
 *
 *   tier 1  cheap triage   : a small/local filter runs over the WHOLE stream and
 *                            answers only "is this worth the expensive tier?"
 *   tier 2  expensive synth : the capable model runs ONLY on the keepers...
 *   cap     per-run bound   : ...and never on more than `perRunCap` per run.
 *
 * A cost meter proves the bound: total cost has a ceiling you set, regardless of
 * how large or noisy the stream is. Overflow keepers drain over later runs.
 *
 * From scratch, no dependencies. Run it:  npx tsx two-tier-loop.ts
 */

interface Item {
  id: string;
  text: string;
}

const CHEAP_UNIT = 1; // cost of one triage call (small/local model)
const EXPENSIVE_UNIT = 20; // cost of one synthesis call (frontier model)

class CostMeter {
  cheapCalls = 0;
  expensiveCalls = 0;
  total(): number {
    return this.cheapCalls * CHEAP_UNIT + this.expensiveCalls * EXPENSIVE_UNIT;
  }
}

/** Tier 1: cheap relevance filter. Narrow question only: keep or drop. */
function triage(item: Item, meter: CostMeter): boolean {
  meter.cheapCalls++;
  // A stand-in for a small model / heuristic. Real systems run a tiny local model.
  return /\b(agent|agentic|reliability|governance)\b/i.test(item.text);
}

/** Tier 2: expensive synthesis. The real work, only ever on pre-filtered keepers. */
function synthesize(item: Item, meter: CostMeter): string {
  meter.expensiveCalls++;
  return `claim from ${item.id}`;
}

interface RunResult {
  synthesized: string[];
  /** Keepers that exceeded the cap this run; carried to the next run (already triaged). */
  carry: Item[];
}

/**
 * One run. Triage the NEW stream (cheap), combine with any carried-over keepers
 * (already triaged, so not re-triaged), synthesize up to the cap, carry the rest.
 */
function runOnce(
  newStream: Item[],
  carried: Item[],
  opts: { perRunCap: number; meter: CostMeter }
): RunResult {
  const freshKeepers = newStream.filter((it) => triage(it, opts.meter));
  const candidates = [...carried, ...freshKeepers]; // drain the backlog first
  const toSynth = candidates.slice(0, opts.perRunCap);
  const carry = candidates.slice(opts.perRunCap);
  const synthesized = toSynth.map((it) => synthesize(it, opts.meter));
  return { synthesized, carry };
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

function buildStream(n: number): Item[] {
  // Every 5th item is on-topic (relevant); the rest is noise. ~20% signal.
  return Array.from({ length: n }, (_, i) => ({
    id: `i${i}`,
    text: i % 5 === 0 ? "a note about agentic reliability in production" : "the office lunch menu for tuesday",
  }));
}

function demo(): void {
  const PER_RUN_CAP = 5;
  const stream = buildStream(100);
  const relevant = stream.filter((it) => /\b(agent|agentic|reliability|governance)\b/i.test(it.text)).length;
  console.log(`Stream: ${stream.length} items, ${relevant} genuinely relevant. Per-run cap: ${PER_RUN_CAP}.\n`);

  const meter = new CostMeter();

  console.log("1. Run 1 over the full stream:");
  let { synthesized, carry } = runOnce(stream, [], { perRunCap: PER_RUN_CAP, meter });
  console.log(`   triaged ${stream.length} (cheap), synthesized ${synthesized.length} (expensive), ${carry.length} keepers carried over`);
  console.log(`   expensive calls this run: ${meter.expensiveCalls} (<= cap ${PER_RUN_CAP}: ${meter.expensiveCalls <= PER_RUN_CAP})`);

  // The cost comparison: two-tier vs running the frontier model on everything.
  const naiveCost = stream.length * EXPENSIVE_UNIT;
  console.log(`\n2. Cost so far: ${meter.total()} units.`);
  console.log(`   Naive (synthesize ALL ${stream.length}): ${naiveCost} units. Two-tier saved ~${Math.round((1 - meter.total() / naiveCost) * 100)}%.`);

  console.log("\n3. Drain the backlog over later runs (no new stream). Capped rate, no spike:");
  let run = 2;
  while (carry.length > 0) {
    const before = carry.length;
    ({ synthesized, carry } = runOnce([], carry, { perRunCap: PER_RUN_CAP, meter }));
    console.log(`   run ${run}: synthesized ${synthesized.length}, ${carry.length} left (was ${before}); 0 cheap calls (already triaged)`);
    run++;
  }

  console.log(`\n4. Totals: ${meter.cheapCalls} cheap + ${meter.expensiveCalls} expensive = ${meter.total()} units.`);
  console.log(
    `   The expensive tier ran exactly ${meter.expensiveCalls} times (once per relevant item), never more than ` +
      `${PER_RUN_CAP} in a run. Cost scaled with the cap and the signal, not with the ${stream.length}-item firehose.`
  );
}

demo();

export { runOnce, triage, synthesize, CostMeter };
export type { Item, RunResult };
