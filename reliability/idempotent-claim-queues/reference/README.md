# Reference: claim queue

A runnable `ClaimQueue` for [idempotent, claim-based work queues](../README.md): idempotent
enqueue, an atomic claim, completion/failure, and bounded retry, exercised by two concurrent
workers.

## Run it

```bash
npx tsx claim-queue.ts
```

## What the demo shows

1. Enqueue four items; enqueuing an existing key again is **deduped** (no second row).
2. A **lost-claim race**: two workers `tryClaim` the same id; one wins, the other gets `false`
   and skips, which is a non-event, not an error.
3. **Two concurrent workers** drain the queue and each item is processed **exactly once**
   (printed with which worker handled it), even though both are running against the one queue.
4. A transient failure on the "flaky" item is **retried under its cap** and then succeeds
   (`attempts=2, state=done`).

## What to copy

- The claim is **one atomic operation** (here a synchronous transition; in a database, a
  conditional `UPDATE ... WHERE state='pending'` checked by affected-row count).
- Enqueue **dedupes on a key** so a double-click or a retried producer cannot queue the same
  work twice.
- A **lost race is silent**. Design it as expected, so you can run many workers calmly.
- **Cap retries** and keep the attempt count on the item, so a poison message stops instead of
  spinning forever.

## What this is not

In-memory and single-threaded, so the atomic claim is free here. In production the claim is your
datastore's conditional update or a transaction, and you pair it with a downstream idempotency
key so a crash between "sent" and "marked done" still cannot double-send. The API and the three
rules are what transfer.
