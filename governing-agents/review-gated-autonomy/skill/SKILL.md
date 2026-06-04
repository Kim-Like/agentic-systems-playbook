---
name: review-gated-autonomy
description: Use this when you are about to add ANY capability that lets an agent affect the outside world (send an email or message, post publicly, write to a third party, deploy, spend money, change shared state). It enforces a boundary so the capability ships safe and reversible: one chokepoint, a kill-switch that defaults OFF, a human-approval step, daily caps, and a lossless manual path. Do NOT use it for read-only capabilities.
author: Kim Like
homepage: https://aienterprise.dk
source: https://github.com/Kim-Like/agentic-systems-playbook
license: MIT
---

# Review-gated autonomy

When the task adds a way for an agent to act on the outside world, do not wire the action
directly. Put it behind this boundary first. The goal: nothing reaches the outside world
without a recorded human act, and turning the capability off reverts cleanly to manual with
zero data loss.

## When this applies

Apply it the moment a capability can cause an external side effect: sending a message or
email, posting to a public surface, calling a third-party write API, deploying, spending,
or mutating shared/customer state. If the capability is read-only, skip this skill.

## The procedure

1. **Land the agent's output as a reviewable draft, not an action.** The agent produces a
   record in a `queued` state. It does not act.

2. **Define exactly one enqueue chokepoint.** Create a single function (name it explicitly,
   e.g. `enqueueForDispatch`) that is the ONLY code that moves work into the send queue.
   Make it private to its module and idempotent. Reach it from exactly one place: a human
   approval. Add a test that fails if any other caller writes to the queue.

3. **Add a kill-switch that ships OFF.** A global enable flag plus a per-surface enable flag,
   both defaulting to disabled. Read them at send time, not at boot. The capability goes live
   when someone flips a flag on purpose, never on deploy.

4. **Gate the dispatcher, and let it only read the queue.** The background sender checks, in
   order: global flag on, per-surface flag on, per-surface daily cap not exhausted. If any
   gate says no, the record stays `pending` (no send, no error, no state change). The
   dispatcher never creates queue records.

5. **Add a daily cap that defers, never drops.** A record over the cap waits for the next
   period rather than failing. This bounds blast radius and makes a runaway impossible.

6. **Add a manual path that records but does not perform.** A human can mark an approved
   draft as done-by-hand (with a required note). This must cancel the queue record so the
   dispatcher cannot also send it. This is what makes the OFF state fully functional: you
   lose no capability, you just do the last step yourself.

7. **Audit every real event.** Write a non-secret row on enqueue, send, failure, cancel, and
   manual publish. No secret values in the audit. "What did this system do to the outside
   world, and who authorized it" must be answerable from the log.

## Acceptance checks

Before considering the capability done, confirm:

- [ ] The send queue has exactly one writer, reached only from an approval (test enforces it).
- [ ] With every flag OFF, the dispatcher is a no-op and the manual path still works.
- [ ] A capped record stays pending and is picked up later, never dropped or failed.
- [ ] Manual publish and archive both cancel the pending record (no double-action).
- [ ] Every send traces to a recorded human approval in the audit log.
- [ ] No credential appears in the queue, the audit log, or any error string.

## Anti-patterns to refuse

- Sending directly from the place the agent generates the action.
- A second, undocumented path that enqueues or sends ("just this one background job").
- A capability that defaults ON, or that cannot be fully disabled without losing queued work.
- Dropping over-cap work instead of deferring it.
- Treating "the model was told not to" as a control. Controls are code, not instructions.

## Reference

A runnable implementation of this boundary (review queue, single chokepoint, gated
dispatcher, daily cap, manual path, audit log) is in the `reference/` folder of the
`review-gated-autonomy` entry in the agentic-systems-playbook.
