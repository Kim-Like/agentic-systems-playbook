# Reference: dispatch envelope

A runnable dispatcher for [the dispatch-envelope contract](../README.md): a typed request
envelope down, a typed result envelope back, and the hard rule that the parent never inherits the
child's working context.

## Run it

```bash
npx tsx dispatch-envelope.ts
```

## What the demo shows

1. A parent (holding its own state plus a secret) delegates three jobs, each through a typed
   request envelope carrying only that job's inputs.
2. The children's combined working context is 90 units; the parent's context grows by **3** (one
   result summary each), not 90. The child work never crosses back.
3. The parent context afterward is just its own state plus the three summaries: lean.
4. Isolation the other way: each child was invoked with only its envelope, so none could read the
   parent's secret. It was never passed.

## What to copy

- The request envelope carries **only the inputs, named explicitly.** Not the parent's state,
  not the conversation, not "context that might help".
- The child returns a **result and a summary, not its transcript.**
- The dispatcher appends **only the result summary** to the parent; the child's working context
  is discarded. This is the line that keeps the parent lean across many delegations.
- "Typed" makes the contract readable without reading either agent; "explicit" makes adding an
  input a deliberate decision, which is what stops the bleed.

## What this is not

Synchronous and in-process, with sizes standing in for real token costs. In a real system the
child is a separate agent run or service, the envelopes are validated schemas, and the result
travels over a queue or RPC. The two-way typed boundary and the no-inherit rule are what matter.
