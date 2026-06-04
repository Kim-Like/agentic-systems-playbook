# Reference: review-gated dispatch

A single-file, dependency-light TypeScript implementation of the
[review-gated autonomy](../README.md) pattern. It is written to be read top to bottom in
one sitting, and to make the core invariant impossible to miss.

## Run it

```bash
npx tsx review-gated-dispatch.ts
```

(Any TypeScript runner works: `tsx`, `ts-node`, or `tsc && node`. No dependencies beyond a
TypeScript toolchain.)

## What the demo shows

The `demo()` at the bottom walks one batch of agent output through the whole boundary:

1. The agent drafts three items autonomously.
2. A human approves two and archives one. Only the approvals enter the outbox; the archived
   item is never enqueued.
3. The dispatcher runs while every switch is **OFF** (the shipped default). Nothing is sent;
   the records wait.
4. The operator publishes one item **by hand** and records it. Its outbox record is cancelled,
   so the dispatcher will not also send it.
5. The operator flips the switches **ON**; the dispatcher sends the one remaining item.
6. The audit trail prints, one line per real event.

The closing line states the guarantee the code enforces: every send traces back to an
approval, the off-state lost nothing, and the dispatcher created zero outbox records.

## What to copy

The shapes worth taking to your own stack:

- **`enqueueForDispatch` is private and singular.** It is the only writer to the outbox, and
  it is reached only from an `approve`. In a real system, add a test that greps for other
  writers and fails if it finds one.
- **`runCycle` reads, never writes the outbox**, and returns early when the global switch is
  off. Gates are checked before the surface adapter is ever called.
- **`markPublishedManually` and archive both cancel the pending record.** This is what makes
  the off-state lossless and prevents a double-send.
- **The `Surface` adapter never decides whether to send.** It only delivers and returns a
  reference, or throws. All policy lives in the dispatcher.

## What this is not

In-memory, single-threaded, no persistence, no real surface. A production version persists
drafts and outbox records, makes the claim step atomic (a compare-and-set, so two workers
cannot grab the same record), reads the switches from configuration at cycle time, and adds
retry/backoff on failure. The structure above does not change; only the storage and
concurrency do.
