/**
 * Idempotent, claim-based work queue, a runnable reference.
 *
 *   - enqueue(key, ...) is IDEMPOTENT: the same key while active does not duplicate.
 *   - claim() is ATOMIC: it moves one item pending -> sending and returns it to
 *     exactly one caller. A second caller racing the same item loses, silently.
 *   - fail() retries up to a cap (back to pending with an attempt count), then
 *     leaves the item failed for a human.
 *
 * Single-threaded JS makes the synchronous claim trivially atomic; in a real
 * system the same claim is a conditional UPDATE ... WHERE state='pending' and you
 * check the affected-row count. The demo runs TWO concurrent workers to show each
 * item is processed exactly once.
 *
 * From scratch, no dependencies. Run it:  npx tsx claim-queue.ts
 */

type JobState = "pending" | "sending" | "done" | "failed";

interface Job {
  id: string;
  key: string;
  payload: string;
  state: JobState;
  attempts: number;
  ref?: string;
  error?: string;
}

class ClaimQueue {
  private jobs = new Map<string, Job>();
  private seq = 0;
  constructor(private readonly maxAttempts = 3) {}

  /** Idempotent: if an ACTIVE (pending/sending) job already has this key, return it. */
  enqueue(key: string, payload: string): { job: Job; created: boolean } {
    for (const j of this.jobs.values()) {
      if (j.key === key && (j.state === "pending" || j.state === "sending")) {
        return { job: j, created: false };
      }
    }
    const job: Job = { id: `j_${++this.seq}`, key, payload, state: "pending", attempts: 0 };
    this.jobs.set(job.id, job);
    return { job, created: true };
  }

  /** Atomic claim: take the oldest pending item, mark it sending, return it (or null). */
  claim(): Job | null {
    for (const j of this.jobs.values()) {
      if (j.state === "pending") {
        j.state = "sending"; // the atomic pending -> sending transition
        j.attempts++;
        return j;
      }
    }
    return null;
  }

  /** Claim a SPECIFIC id (compare-and-set). Returns false if already claimed (lost race). */
  tryClaim(id: string): boolean {
    const j = this.jobs.get(id);
    if (!j || j.state !== "pending") return false;
    j.state = "sending";
    j.attempts++;
    return true;
  }

  complete(id: string, ref: string): void {
    const j = this.jobs.get(id);
    if (j) {
      j.state = "done";
      j.ref = ref;
    }
  }

  /** Fail: retry (back to pending) until the attempt cap, then leave it failed. */
  fail(id: string, error: string): "retry" | "given_up" {
    const j = this.jobs.get(id);
    if (!j) return "given_up";
    j.error = error;
    if (j.attempts < this.maxAttempts) {
      j.state = "pending";
      return "retry";
    }
    j.state = "failed";
    return "given_up";
  }

  stats() {
    const s: Record<JobState, number> = { pending: 0, sending: 0, done: 0, failed: 0 };
    for (const j of this.jobs.values()) s[j.state]++;
    return s;
  }
  all(): Job[] {
    return [...this.jobs.values()];
  }
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

async function demo(): Promise<void> {
  const q = new ClaimQueue(3);

  console.log("1. Enqueue work; a duplicate key is deduped (idempotent enqueue):");
  for (const [k, p] of [["a", "alpha"], ["b", "bravo"], ["c", "charlie"], ["d", "flaky"]] as const) {
    console.log(`   enqueue ${k}: created=${q.enqueue(k, p).created}`);
  }
  console.log(`   enqueue b again: created=${q.enqueue("b", "bravo").created}  (deduped, no second row)`);

  console.log("\n2. A lost-claim race on one item (two workers, same id):");
  const target = q.all()[0].id;
  // re-pend it for the race demo, then both workers go for it
  q.all()[0].state = "pending";
  console.log(`   worker A tryClaim(${target}): ${q.tryClaim(target)}`);
  console.log(`   worker B tryClaim(${target}): ${q.tryClaim(target)}  (lost the race -> silent skip)`);
  q.complete(target, `ref_${target}`); // A finishes the one it won

  console.log("\n3. TWO concurrent workers drain the rest. Each item processed once:");
  const processed: string[] = [];
  async function worker(name: string): Promise<void> {
    for (;;) {
      const job = q.claim();
      if (!job) return; // nothing left to claim -> this worker is done
      await tick(); // simulate the async side effect (a send)
      try {
        if (job.payload === "flaky" && job.attempts === 1) throw new Error("transient provider error");
        q.complete(job.id, `ref_${job.id}`);
        processed.push(`${job.key}->${name}`);
      } catch (e) {
        const r = q.fail(job.id, e instanceof Error ? e.message : String(e));
        console.log(`   ${name} hit a failure on ${job.key} (attempt ${job.attempts}): ${r}`);
      }
    }
  }
  await Promise.all([worker("A"), worker("B")]);

  console.log(`   processed (each exactly once): ${processed.sort().join(", ")}`);
  console.log(`   final stats: ${JSON.stringify(q.stats())}`);
  const flaky = q.all().find((j) => j.payload === "flaky")!;
  console.log(`   the flaky job: state=${flaky.state}, attempts=${flaky.attempts} (retried, then succeeded)`);

  console.log(
    "\nNo item was processed twice despite two workers, the duplicate enqueue was deduped, " +
      "the lost race was a non-event, and the transient failure was retried under its cap."
  );
}

demo();

export { ClaimQueue };
export type { Job, JobState };
