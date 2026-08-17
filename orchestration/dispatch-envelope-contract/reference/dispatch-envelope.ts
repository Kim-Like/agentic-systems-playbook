/**
 * The dispatch-envelope contract, a runnable reference.
 *
 * A parent delegates to a child through a TYPED request envelope (only the inputs
 * the job needs). The child runs in its own context and returns a TYPED result
 * envelope (output + summary, not its transcript). The dispatcher enforces the
 * hard rule: the parent's context grows ONLY by the result, never by the child's
 * working context. Delegate ten times and the parent stays lean.
 *
 * From scratch, no dependencies. Run it:  npx tsx dispatch-envelope.ts
 */

/** What the parent hands down: only the inputs, explicitly. No parent state, no transcript. */
interface RequestEnvelope<I> {
  task: string;
  inputs: I;
  constraints?: string[];
}

/** What the child hands back: the output and a short summary, NOT its working context. */
interface ResultEnvelope<O> {
  output: O;
  summary: string;
}

/** A child's run: the clean result that crosses back, plus the working context that does NOT. */
interface ChildRun<O> {
  result: ResultEnvelope<O>;
  /** The child's scratch context size (docs read, steps taken). Stays in the child; discarded. */
  workingContextSize: number;
}

type Child<I, O> = (req: RequestEnvelope<I>) => ChildRun<O>;

interface Parent {
  /** The orchestrator's context. It should grow only by result summaries. */
  context: string[];
}

/**
 * Delegate one job. The child is invoked with ONLY the envelope (it cannot see
 * `parent.context`, by construction: it is never passed). The parent's context
 * grows by exactly one line (the result summary); the child's working context is
 * discarded here, never merged back.
 */
function dispatch<I, O>(parent: Parent, child: Child<I, O>, req: RequestEnvelope<I>): ResultEnvelope<O> {
  const run = child(req); // <- the child receives req and nothing else
  parent.context.push(`[result:${req.task}] ${run.result.summary}`);
  // run.workingContextSize is intentionally NOT added to parent.context.
  return run.result;
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

// A child that "reads" many documents internally but returns only a summary.
const summarizeFeed: Child<{ items: number }, { kept: number }> = (req) => {
  const read = req.inputs.items; // the child builds a big working context...
  const kept = Math.floor(read / 12);
  return { result: { output: { kept }, summary: `kept ${kept} of ${read} items` }, workingContextSize: read };
};

const draftReply: Child<{ thread: string }, { chars: number }> = (req) => {
  const steps = 20; // pretend it consulted 20 prior messages
  const chars = req.inputs.thread.length * 3;
  return { result: { output: { chars }, summary: `drafted a ${chars}-char reply` }, workingContextSize: steps };
};

const classify: Child<{ text: string }, { label: string }> = (req) => {
  const steps = 10;
  const label = req.inputs.text.includes("urgent") ? "urgent" : "normal";
  return { result: { output: { label }, summary: `classified as ${label}` }, workingContextSize: steps };
};

function demo(): void {
  const parent: Parent = { context: ["parent-state: campaign config", "parent-secret: api credential"] };
  console.log(`Parent context starts with ${parent.context.length} items (incl. a secret the children must not see).\n`);

  console.log("1. Delegate three jobs, each via a typed request envelope (inputs only):");
  const r1 = dispatch(parent, summarizeFeed, { task: "summarize-feed", inputs: { items: 60 } });
  const r2 = dispatch(parent, draftReply, { task: "draft-reply", inputs: { thread: "a long thread here" } });
  const r3 = dispatch(parent, classify, { task: "classify", inputs: { text: "this is urgent" } });
  console.log(`   results: ${JSON.stringify([r1.output, r2.output, r3.output])}`);

  const childWork = 60 + 20 + 10;
  console.log(`\n2. The children's combined working context: ${childWork} units (docs read, steps taken).`);
  console.log(`   Parent context after 3 delegations: ${parent.context.length} items.`);
  console.log(`   It grew by 3 (one summary each), NOT by ${childWork}. The child work never crossed back.`);

  console.log("\n3. The parent context now (only its own state + the three result summaries):");
  for (const line of parent.context) console.log(`   - ${line}`);

  console.log("\n4. Isolation the other way: a child only ever receives its envelope.");
  console.log("   The children above were invoked with their request only; none could read");
  console.log("   'parent-secret', because the parent context was never passed to them.");

  console.log(
    "\nThe contract held both ways: children got only their inputs, the parent got only the " +
      "results. Delegations compose without contexts bleeding into each other."
  );
}

demo();

export { dispatch };
export type { RequestEnvelope, ResultEnvelope, ChildRun, Child, Parent };
