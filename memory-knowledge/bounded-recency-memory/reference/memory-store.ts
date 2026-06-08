/**
 * Bounded, recency-banded memory, a runnable reference.
 *
 * An agent's learned-belief store with four governance rules baked in:
 *   1. domain-scope on write   (reject out-of-scope claims)
 *   2. dedupe                  (Jaccard + containment; merge near-duplicates)
 *   3. cap + compaction        (bound the ACTIVE set; archive the weakest)
 *   4. recency banding         (fresh / aging / outdated, aged from LEARNED-AT)
 * The digest (what you inject into the prompt) emits fresh + aging, excludes outdated.
 *
 * From scratch, no dependencies. Run it:  npx tsx memory-store.ts
 */

type Band = "fresh" | "aging" | "outdated";

interface Claim {
  id: string;
  text: string;
  topic: string;
  confidence: number; // [0, 1]
  learnedAt: number; // epoch ms, when the AGENT learned it (not when the source was published)
  status: "active" | "archived";
  band: Band;
}

interface MemoryOptions {
  /** The topics this agent's memory is ABOUT. A claim outside them is rejected. */
  domains: string[];
  /** Hard ceiling on ACTIVE claims. Over it, compaction archives the weakest. */
  activeCap: number;
  freshMaxDays: number; // younger than this -> fresh
  outdatedMinDays: number; // older than this -> outdated; between -> aging
  /** Dedupe thresholds (either one tripping = duplicate). */
  jaccard: number;
  containment: number;
}

const DAY = 86_400_000;
let seq = 0;

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Fraction of the SMALLER set contained in the larger (catches verbose restatements). */
function containment(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const t of small) if (large.has(t)) inter++;
  return inter / small.size;
}

type AddResult =
  | { result: "added"; id: string }
  | { result: "rejected_scope"; reason: string }
  | { result: "merged_duplicate"; into: string };

class MemoryStore {
  private claims: Claim[] = [];
  constructor(private readonly opts: MemoryOptions) {}

  add(
    input: { text: string; topic: string; confidence: number; learnedAt: number },
    now: number
  ): AddResult {
    // 1. domain-scope
    if (!this.opts.domains.includes(input.topic)) {
      return { result: "rejected_scope", reason: `topic "${input.topic}" is out of domain` };
    }

    // 2. dedupe against the active set
    const incoming = tokenize(input.text);
    for (const c of this.claims) {
      if (c.status !== "active") continue;
      const toks = tokenize(c.text);
      if (jaccard(incoming, toks) >= this.opts.jaccard || containment(incoming, toks) >= this.opts.containment) {
        // Keep the stronger statement; refresh learnedAt so the merged belief is current.
        if (input.confidence > c.confidence) c.text = input.text;
        c.confidence = Math.max(c.confidence, input.confidence);
        c.learnedAt = Math.max(c.learnedAt, input.learnedAt);
        return { result: "merged_duplicate", into: c.id };
      }
    }

    const claim: Claim = {
      id: `c_${++seq}`,
      text: input.text,
      topic: input.topic,
      confidence: input.confidence,
      learnedAt: input.learnedAt,
      status: "active",
      band: "fresh",
    };
    this.claims.push(claim);

    // 3. cap + compaction
    this.compact(now);
    return { result: "added", id: claim.id };
  }

  /** Archive the weakest active claims (lowest confidence, then oldest) until at cap. */
  private compact(_now: number): number {
    const active = this.claims.filter((c) => c.status === "active");
    if (active.length <= this.opts.activeCap) return 0;
    const ranked = [...active].sort(
      (a, b) => a.confidence - b.confidence || a.learnedAt - b.learnedAt
    );
    let archived = 0;
    for (const c of ranked) {
      if (active.length - archived <= this.opts.activeCap) break;
      c.status = "archived";
      archived++;
    }
    return archived;
  }

  /** 4. recency banding, aged from learnedAt. */
  private bandFor(c: Claim, now: number): Band {
    const ageDays = (now - c.learnedAt) / DAY;
    if (ageDays < this.opts.freshMaxDays) return "fresh";
    if (ageDays >= this.opts.outdatedMinDays) return "outdated";
    return "aging";
  }

  /** The prompt-injection surface: fresh first, then aging; outdated + archived excluded. */
  digest(now: number): { fresh: Claim[]; aging: Claim[]; excludedOutdated: number; archived: number } {
    for (const c of this.claims) if (c.status === "active") c.band = this.bandFor(c, now);
    const active = this.claims.filter((c) => c.status === "active");
    return {
      fresh: active.filter((c) => c.band === "fresh").sort((a, b) => b.learnedAt - a.learnedAt),
      aging: active.filter((c) => c.band === "aging").sort((a, b) => b.learnedAt - a.learnedAt),
      excludedOutdated: active.filter((c) => c.band === "outdated").length,
      archived: this.claims.filter((c) => c.status === "archived").length,
    };
  }

  renderDigest(now: number): string {
    const d = this.digest(now);
    const line = (c: Claim) => `  - (${c.confidence.toFixed(2)}) ${c.text}`;
    const parts = [`# Memory digest (${d.fresh.length} fresh, ${d.aging.length} aging, ${d.excludedOutdated} outdated excluded, ${d.archived} archived)`];
    if (d.fresh.length) parts.push("## Fresh (quote first)\n" + d.fresh.map(line).join("\n"));
    if (d.aging.length) parts.push("## Aging (lower weight, verify before quoting)\n" + d.aging.map(line).join("\n"));
    return parts.join("\n");
  }

  activeCount(): number {
    return this.claims.filter((c) => c.status === "active").length;
  }
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

function demo(): void {
  const now = 1_700_000_000_000; // a fixed "now" so aging is deterministic
  const daysAgo = (n: number) => now - n * DAY;

  const mem = new MemoryStore({
    domains: ["agent-reliability", "agent-governance"],
    activeCap: 4,
    freshMaxDays: 30,
    outdatedMinDays: 90,
    jaccard: 0.6,
    containment: 0.8,
  });

  console.log("1. Add in-domain claims:");
  for (const c of [
    { text: "Agents fail silently more often than they crash", topic: "agent-reliability", confidence: 0.9, learnedAt: daysAgo(2) },
    { text: "An approval gate is the cheapest control on autonomy", topic: "agent-governance", confidence: 0.85, learnedAt: daysAgo(5) },
    { text: "Input-boundary checks catch the production surprise a demo never has", topic: "agent-reliability", confidence: 0.8, learnedAt: daysAgo(10) },
  ]) {
    console.log("  ", mem.add(c, now), `(${c.text.slice(0, 40)}...)`);
  }

  console.log("\n2. Reject an out-of-scope claim:");
  console.log("  ", mem.add({ text: "The local team won on the weekend", topic: "sports", confidence: 0.9, learnedAt: daysAgo(1) }, now));

  console.log("\n3. Add a near-duplicate (verbose restatement) -> merged, not duplicated:");
  console.log("  ", mem.add({ text: "In practice agents tend to fail silently far more often than they actually crash outright", topic: "agent-reliability", confidence: 0.95, learnedAt: daysAgo(1) }, now));
  console.log(`   active claims: ${mem.activeCount()} (still distinct)`);

  console.log("\n4. Exceed the cap (4) -> compaction archives the weakest:");
  for (const c of [
    { text: "Daily caps defer work instead of dropping it", topic: "agent-governance", confidence: 0.7, learnedAt: daysAgo(3) },
    { text: "Audit rows make incidents investigable", topic: "agent-governance", confidence: 0.6, learnedAt: daysAgo(4) },
  ]) mem.add(c, now);
  console.log(`   active claims after adds: ${mem.activeCount()} (capped at 4; weakest archived)`);

  console.log("\n5. Age a claim past the outdated threshold -> excluded from the digest:");
  mem.add({ text: "An older governance note learned long ago", topic: "agent-governance", confidence: 0.99, learnedAt: daysAgo(120) }, now);
  // high confidence so it survives the cap, but it is 120 days old -> outdated -> not injected

  console.log("\n--- DIGEST (what the prompt actually sees) ---");
  console.log(mem.renderDigest(now));
  console.log(
    "\nNote: the 120-day-old claim has the HIGHEST confidence yet is excluded, because it is " +
      "outdated. Recency beats confidence in the digest. That is the anti-drift rule."
  );
}

demo();

export { MemoryStore };
export type { Claim, MemoryOptions };
