/**
 * Deterministic content guardrails, a runnable reference.
 *
 * A configurable gate of hard rules that generated text must pass before it can
 * ship. On a failure: regenerate ONCE with the violation fed back, then REFUSE.
 * Creativity from the model; compliance from the lint.
 *
 * From scratch, no dependencies. Run it:  npx tsx content-gate.ts
 */

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** A rule returns null when the text passes, or a human-readable reason when it fails. */
interface Rule {
  name: string;
  test(text: string): string | null;
}

const bannedPattern = (name: string, re: RegExp, reason: string): Rule => ({
  name,
  test: (t) => (re.test(t) ? reason : null),
});

const bannedPhrase = (phrase: string): Rule => ({
  name: `no-phrase:${phrase}`,
  test: (t) => (t.toLowerCase().includes(phrase.toLowerCase()) ? `contains banned phrase "${phrase}"` : null),
});

const maxLength = (n: number): Rule => ({
  name: `max-length:${n}`,
  test: (t) => (t.length > n ? `too long: ${t.length} > ${n} chars` : null),
});

// Common hard rules for public, on-voice content.
const NO_EM_DASH = bannedPattern("no-em-dash", /[—–]|--/, "contains an em-dash, en-dash, or '--'");
// A compact emoji range check (pictographs + symbols). Illustrative, not exhaustive.
const NO_EMOJI = bannedPattern("no-emoji", /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u, "contains an emoji");

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

interface Violation {
  rule: string;
  reason: string;
}

class ContentGate {
  constructor(private readonly rules: Rule[]) {}
  check(text: string): { ok: boolean; violations: Violation[] } {
    const violations: Violation[] = [];
    for (const r of this.rules) {
      const reason = r.test(text);
      if (reason) violations.push({ rule: r.name, reason });
    }
    return { ok: violations.length === 0, violations };
  }
}

class GateRefusal extends Error {
  constructor(public readonly violations: Violation[]) {
    super(`content refused after retry: ${violations.map((v) => v.reason).join("; ")}`);
    this.name = "GateRefusal";
  }
}

/**
 * Generate, gate, regenerate once with the violation fed back, then refuse.
 * `generate(retryNote?)` is your model call; on the retry it receives a note
 * naming what to fix. Throws GateRefusal rather than ever returning a violation.
 */
async function generateWithGate(
  generate: (retryNote?: string) => Promise<string>,
  gate: ContentGate,
  opts: { maxRetries?: number } = {}
): Promise<{ text: string; attempts: number }> {
  const maxRetries = opts.maxRetries ?? 1;
  let lastViolations: Violation[] = [];
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const note =
      attempt === 1
        ? undefined
        : `Your previous attempt failed a hard rule: ${lastViolations.map((v) => v.reason).join("; ")}. Rewrite to satisfy it. Keep everything else.`;
    const text = await generate(note);
    const { ok, violations } = gate.check(text);
    if (ok) return { text, attempts: attempt };
    lastViolations = violations;
  }
  throw new GateRefusal(lastViolations); // never ship a violation
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

const gate = new ContentGate([NO_EM_DASH, NO_EMOJI, maxLength(280), bannedPhrase("game-changer")]);

/** A fake model whose behavior we script per scenario, so the demo is deterministic. */
function fakeModel(script: string[]): (note?: string) => Promise<string> {
  let i = 0;
  return async () => script[Math.min(i++, script.length - 1)];
}

async function demo(): Promise<void> {
  console.log("Gate: no em-dash, no emoji, <= 280 chars, no 'game-changer'.\n");

  // 1. Clean on the first try.
  const clean = await generateWithGate(
    fakeModel(["Reliability is the only feature. A demo proves it can; production proves it does."]),
    gate
  );
  console.log(`1. Clean first pass (attempts=${clean.attempts}): "${clean.text}"`);

  // 2. First attempt has an em-dash; the retry (told what to fix) lands clean.
  const fixed = await generateWithGate(
    fakeModel([
      "Reliability is the only feature — demos lie, production tells the truth.",
      "Reliability is the only feature. Demos lie. Production tells the truth.",
    ]),
    gate
  );
  console.log(`2. Fixed on the one retry (attempts=${fixed.attempts}): "${fixed.text}"`);

  // 3. A stubborn violation: every attempt keeps the em-dash. Refused, not shipped.
  try {
    await generateWithGate(
      fakeModel(["This is a game-changer — truly.", "Still a game-changer — sorry."]),
      gate
    );
    console.log("3. (unreachable) should have refused");
  } catch (e) {
    if (e instanceof GateRefusal) {
      console.log(`3. Refused after retry (nothing shipped): ${e.violations.map((v) => v.reason).join("; ")}`);
    } else throw e;
  }

  console.log(
    "\nThe clean text shipped, the fixable one was fixed on a single retry, and the stubborn " +
      "one was refused rather than published. The model was creative; the gate was absolute."
  );
}

demo();

export { ContentGate, generateWithGate, GateRefusal, bannedPattern, bannedPhrase, maxLength, NO_EM_DASH, NO_EMOJI };
export type { Rule, Violation };
