# Idempotent, claim-based work queues

> Two workers, one queue, zero double-sends. The moment more than one process drains your
> agent's outbox, "it sent the email twice" is a bug waiting to happen. The atomic claim is how
> you prevent it, and it is older and simpler than anything agent-specific.

When an agent's approved work waits in a queue and a worker sends it, you will eventually run
more than one worker: for throughput, for redundancy, or just because a cron overlapped itself.
The instant you do, you need the queue to guarantee each item is processed once. This pattern is
that guarantee, in three small rules.

## The problem

A naive worker does "read the pending items, send each one". Run two of those at the same time
and they both read the same pending item and both send it. Now a customer has two identical
emails, or a post appears twice. The window is tiny and it will absolutely happen under load,
on a retry, or when a slow run overlaps the next scheduled one. You cannot fix this by being
careful in the worker; you fix it in how work is claimed.

## The pattern

**1. Atomic claim (the core).** A worker does not "read then process". It **claims**: a single
atomic operation that moves an item from `pending` to `sending` and tells the worker whether it
won. Only the winner processes the item. In a database this is a conditional update
(`UPDATE ... SET state='sending' WHERE id=? AND state='pending'`) and you check the affected
row count: 1 means you claimed it, 0 means someone beat you. The read and the state change are
one operation, so two workers cannot both win.

**2. Idempotent enqueue.** Adding work is keyed and deduplicated: enqueuing the same logical
item twice (same dedupe key) does not create two rows. So a retry of the thing that enqueues, or
an approval clicked twice, cannot put the same send in the queue two times. The queue refuses
the duplicate, it does not trust the caller to be careful.

**3. Lost race is a silent skip, not an error.** When a worker tries to claim an item another
worker already took, that is normal and expected, not a failure. The losing worker shrugs and
moves to the next item. No error, no log noise, no retry of someone else's work. Designing the
lost race as a non-event is what lets you run many workers calmly.

## After the claim: complete, fail, and retry

- **Complete** on success: mark the item `done`, record the external reference it produced.
- **Fail** on error: mark it `failed` with the (sanitized) reason. A failed item does not silently
  vanish; it is visible, and the recovery path is explicit (fix and re-enqueue, or a bounded
  automatic retry that returns it to `pending` with a backoff and an attempt count).
- **Bound the retries.** Retry forever and a poison item spins forever. Cap attempts; after the
  cap, leave it `failed` for a human. The attempt count lives on the item, so the cap is
  enforceable and visible.

## Why "exactly once" is really "claim once, and be idempotent downstream"

True exactly-once delivery across a network is famously hard. What this pattern gives you is
exactly-once *processing of the queue*: each item is claimed by one worker once. For the side
effect itself (the actual send), pair the claim with an idempotency key the downstream provider
honors, so even a crash between "sent" and "marked done" cannot double-send. The claim handles
your workers racing each other; the idempotency key handles you racing yourself across a crash.

## When NOT to use this

- **A single, strictly serial worker** that can never overlap (no second instance, no
  overlapping cron). Then there is no race to lose and a claim is ceremony. Add it the day you
  add a second worker or a retry, which is sooner than you think.
- **Fire-and-forget, loss-tolerant streams** (metrics, best-effort telemetry) where a dropped or
  doubled item does not matter. Do not pay for guarantees you do not need.
- **Do not roll your own distributed lock** to fake the atomic claim. Use the atomicity your
  datastore already gives you (a conditional update, a transaction). A hand-built lock is a new
  bug surface.

## In this folder

- [`reference/`](./reference): a runnable `ClaimQueue` with idempotent `enqueue`, an atomic
  `claim`, completion/failure, and bounded retry. The `demo()` enqueues work (and shows a
  duplicate being deduped), runs **two concurrent workers** against the one queue and shows each
  item processed exactly once, demonstrates a lost-claim race resolving to a silent skip, and
  retries a failed item up to its cap.
- [`skill/`](./skill): an installable skill for putting agent worker queues behind an atomic
  claim by default.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
