/**
 * The single-enqueue invariant, a runnable reference.
 *
 * Two halves:
 *   1. A real chokepoint: one `enqueue()` is the only thing that writes the outbox.
 *   2. A static guard: `assertSingleWriter()` scans source text and FAILS when any
 *      module other than the named writer(s) performs the low-level write. Wire
 *      this into your test suite / CI so the invariant cannot erode by drift.
 *
 * From scratch, no dependencies. Run it:  npx tsx single-writer-check.ts
 */

// ---------------------------------------------------------------------------
// 1. The real chokepoint
// ---------------------------------------------------------------------------

interface OutboxItem {
  id: string;
  payload: string;
}

// The low-level store. The raw write is `OUTBOX.push(`. In real code this would
// be a DB INSERT. The whole game is: that raw write happens in exactly one place.
const OUTBOX: OutboxItem[] = [];
let seq = 0;

/** THE chokepoint. The only function permitted to write the outbox. */
export function enqueue(payload: string): OutboxItem {
  const item = { id: `o_${++seq}`, payload };
  OUTBOX.push(item); // <- the single raw write
  return item;
}

// ---------------------------------------------------------------------------
// 2. The static guard
// ---------------------------------------------------------------------------

interface Violation {
  file: string;
  line: number;
  text: string;
}

interface CheckResult {
  ok: boolean;
  violations: Violation[];
}

/**
 * Assert that the low-level write (`rawWrite`) appears ONLY in the named
 * `allowedWriters`. Any other file containing it is a violation, unless the
 * specific line carries the `allowComment` escape hatch (a deliberate, reviewed
 * exception that stays on the record).
 *
 * `files` maps a filename to its source text. In a real project you would read
 * the repo from disk; passing strings keeps this reference self-contained.
 */
export function assertSingleWriter(
  files: Record<string, string>,
  opts: { rawWrite: RegExp; allowedWriters: string[]; allowComment: string }
): CheckResult {
  const violations: Violation[] = [];
  const allowed = new Set(opts.allowedWriters);
  for (const [file, source] of Object.entries(files)) {
    if (allowed.has(file)) continue; // the chokepoint(s) are where the write belongs
    source.split("\n").forEach((text, i) => {
      if (opts.rawWrite.test(text) && !text.includes(opts.allowComment)) {
        violations.push({ file, line: i + 1, text: text.trim() });
      }
    });
  }
  return { ok: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

const RAW_WRITE = /\bOUTBOX\.push\(/;
const ALLOW = "single-writer:allow";

function report(label: string, r: CheckResult): void {
  if (r.ok) {
    console.log(`   ${label}: PASS (the outbox has a single writer)`);
  } else {
    console.log(`   ${label}: FAIL`);
    for (const v of r.violations) {
      console.log(`     bypass in ${v.file}:${v.line}  ->  ${v.text}`);
    }
  }
}

function demo(): void {
  // A compliant codebase: only enqueue.ts writes; everyone else calls enqueue().
  const compliant: Record<string, string> = {
    "enqueue.ts": "export function enqueue(p){ OUTBOX.push({id, payload:p}); }",
    "worker.ts": "import {enqueue} from './enqueue'; enqueue(job.payload);",
    "approve.ts": "import {enqueue} from './enqueue'; if (approved) enqueue(draft.body);",
  };

  console.log("1. Compliant codebase (one writer, everyone routes through it):");
  report("check", assertSingleWriter(compliant, { rawWrite: RAW_WRITE, allowedWriters: ["enqueue.ts"], allowComment: ALLOW }));

  // Drift: a background job grew its own direct write. Nobody decided to weaken
  // the gate; it eroded by one reasonable-looking shortcut.
  const drifted: Record<string, string> = {
    ...compliant,
    "nightly-job.ts": "// quick path, skip the queue\nOUTBOX.push({id, payload: row.body});",
  };

  console.log("\n2. A background job added a direct write (the drift):");
  report("check", assertSingleWriter(drifted, { rawWrite: RAW_WRITE, allowedWriters: ["enqueue.ts"], allowComment: ALLOW }));
  console.log("   -> CI goes red, names the file, and the gate stays singular.");

  // Deliberate second writer: a separately-justified priority path, ADDED to the
  // invariant on purpose (named in allowedWriters, documented).
  const twoWriters: Record<string, string> = {
    ...compliant,
    "priority-enqueue.ts": "export function enqueuePriority(p){ OUTBOX.push({id, payload:p}); }",
  };

  console.log("\n3. A SECOND writer added on purpose (named in the invariant):");
  report("check", assertSingleWriter(twoWriters, { rawWrite: RAW_WRITE, allowedWriters: ["enqueue.ts", "priority-enqueue.ts"], allowComment: ALLOW }));
  console.log("   -> allowed, because the set of writers is a short, named, reviewed list.");

  // Prove the real chokepoint works, too.
  enqueue("first");
  enqueue("second");
  console.log(`\n4. The chokepoint itself: ${OUTBOX.length} items written, all via enqueue().`);

  console.log(
    "\nThe invariant is not 'always exactly one'. It is 'the writers are a named, " +
      "reviewed list, and nothing joins it by accident'. The test is what enforces that."
  );
}

demo();
