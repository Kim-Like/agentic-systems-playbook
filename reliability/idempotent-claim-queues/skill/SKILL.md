---
name: idempotent-claim-queue
description: Use this when an agent's queued work is drained by a worker AND there could be more than one worker (a second instance, a retry, an overlapping cron), so an item must be processed exactly once. It enforces an atomic claim, idempotent enqueue, lost-race-as-silent-skip, and bounded retry. Do NOT use it for a single strictly-serial worker or for loss-tolerant fire-and-forget streams.
author: Kim Like
homepage: https://aienterprise.dk
source: https://github.com/Kim-Like/agentic-systems-playbook
license: MIT
---

# Idempotent claim queue

When work waits in a queue and a worker acts on it, and there is any chance of more than one
worker running at once, do not write a "read the pending items then process each" loop. That
double-sends under concurrency. Put the queue behind an atomic claim.

## When this applies

A queue drained by a worker where a second worker could exist: another instance, a retry path,
or a scheduled run that can overlap the previous one. If there is genuinely one strictly-serial
worker forever, or the stream is loss-tolerant (metrics, telemetry), skip this.

## The procedure

1. **Claim atomically; never read-then-process.** A worker takes an item with a single
   operation that moves it `pending -> sending` and tells the worker whether it won. In a
   database this is `UPDATE ... SET state='sending' WHERE id=? AND state='pending'`, checking the
   affected-row count (1 = claimed, 0 = someone beat you). Only the winner processes it.

2. **Make enqueue idempotent.** Key the work and dedupe: enqueuing the same logical item again
   (same key, while still active) returns the existing item instead of adding a second. A retried
   producer or a double-click cannot queue the same send twice.

3. **Treat a lost claim as a silent skip.** Losing a claim to another worker is normal and
   expected. No error, no log noise, no retry of someone else's work. Move to the next item.

4. **On success, complete and record the reference.** On failure, mark it failed with a
   sanitized reason; it stays visible, it does not vanish.

5. **Bound retries.** Retry returns the item to `pending` with an incremented attempt count and a
   backoff. Cap the attempts; after the cap, leave it failed for a human. The count lives on the
   item so the cap is enforceable.

6. **Pair the claim with a downstream idempotency key** so a crash between "sent" and "marked
   done" cannot double-send. The claim handles workers racing each other; the idempotency key
   handles you racing yourself across a crash.

## Acceptance checks

- [ ] Two workers running concurrently process each item exactly once.
- [ ] The claim is one atomic operation, not a read followed by a separate write.
- [ ] Enqueuing the same key twice while active does not create a second item.
- [ ] A worker that loses a claim continues silently (no error, no retry of others' work).
- [ ] A failed item is visible and recovers via bounded retry, then stops at the cap.
- [ ] The side effect carries a downstream idempotency key for crash safety.

## Anti-patterns to refuse

- "Read all pending, then loop and send" (the classic double-send under two workers).
- Trusting the caller not to enqueue duplicates instead of deduping in the queue.
- Logging a lost claim as an error or retrying the work the winner already took.
- Unbounded retries (a poison item spins forever).
- A hand-rolled distributed lock to fake atomicity; use the datastore's conditional update or a
  transaction.

## Related

Sits under **review-gated autonomy** (the queue this drains is the outbox) and the
**single-enqueue invariant** (one writer fills it). Both in the agentic-systems-playbook.
