# Review-gated autonomy

> Let an agent do real work on its own, while guaranteeing that nothing reaches the outside
> world without a recorded human act, and that turning it all off costs you nothing.

This is the pattern everything else in governance sits on. If you get this right, "the agent
went rogue and emailed a customer" stops being a thing that can happen, because there is
exactly one place where the agent can affect the world, and a human stands in front of it.

## The problem

An agent that only drafts is safe and useless. An agent that acts on its own is useful and,
done naively, terrifying. The usual middle ground is "a human approves things," but most
implementations leak: approval lives in three different code paths, a background job can send
without approval, and there is no single switch to stop it when something looks wrong at 2am.

You want all four of these at once:

1. The agent works **autonomously** up to the point of acting.
2. **Nothing acts** without a recorded human decision.
3. There is a **single switch** (and per-surface switches) that halt all sending instantly.
4. Turning everything off **reverts cleanly to manual**, with zero data loss.

## The pattern

Four parts, and a rule that ties them together.

```
  agent ──drafts──▶ [ review queue ] ──approve──▶ enqueueForDispatch() ──▶ [ outbox ]
                          │                            (the ONLY writer)        │
                     human decides                                          dispatcher
                     (or: mark published manually)                     (gated; may send)
```

**1. A review queue.** The agent's output lands as a draft in `queued`. A human moves it:
`approve`, `request_changes`, or `archive`. Approval is the recorded human act.

**2. One enqueue chokepoint.** Approving is the *only* thing that places work in the outbox,
and it does so through a single function, `enqueueForDispatch()`. Nothing else in the system
writes to the outbox. (This is its own pattern: *the single-enqueue invariant*. Enforce it
with a test so a future contributor cannot quietly add a second writer.)

**3. A gated dispatcher.** A background loop drains the outbox, but only sends a record when
**all** gates pass:

- a **global** enable flag (ships OFF),
- a **per-surface** enable flag (ships OFF),
- a **per-surface daily cap** (a record over the cap waits for tomorrow, it does not fail).

While any gate says no, records simply sit in `pending`. No send, no error, no state change.

**4. A manual-publish path.** A human can mark an approved draft as published without the
dispatcher sending it, recording that they did it by hand. This is what makes the whole thing
reversible: with the dispatcher off, you lose no capability, you just do the last step
yourself.

### The rule that ties it together

> The outbox has exactly one writer (`enqueueForDispatch`), reached from exactly one place
> (an approval). The dispatcher only ever *reads* the outbox. Setting every flag OFF reverts
> the system to manual-publish with zero data loss.

If you can hold that rule, you can answer "what can this system do to the outside world, and
how do I stop it" by reading one function and flipping one flag.

## State machines

Draft:

```
queued ──approve──────────▶ approved ──(dispatcher sends, or human marks)──▶ published
  │  └──request_changes──▶ changes_requested ──approve──▶ approved
  └──archive──▶ archived
```

Outbox record:

```
pending ──claim──▶ sending ──deliver ok──▶ sent   (draft ▶ published, audit row)
                       └────deliver throws──▶ failed (audit row; fix + re-approve)
gate says no / cap reached ─▶ stays pending (no change, picked up next cycle)
```

## Why each choice

- **Approval is the only enqueue trigger** so the audit question ("who authorized this?") has
  one answer: the person who approved it.
- **Flags ship OFF** so a new surface goes live deliberately, not by accident on deploy. See
  *kill-switches that ship OFF*.
- **Caps hold records rather than dropping them** so a busy day defers work instead of losing
  it, and you cannot accidentally blast a surface.
- **The dispatcher never creates records** so "is it sending?" and "what is queued?" are
  separate, independently inspectable questions.
- **Manual publish records but does not perform** so the reversibility guarantee is real: the
  off state is fully functional, just slower.

## When NOT to use this

- **Read-only agents.** If the agent never causes a side effect, this is overhead. Add it the
  day it gets a way to act.
- **Genuinely high-volume, low-risk sends** where per-item human approval is absurd (log
  shipping, metrics). Gate the *capability* and sample, do not queue every line.
- **Hard real-time actions** where a human in the loop defeats the purpose. Then your boundary
  is a tight policy check before the act, not a review queue. Different pattern.

A reasonable evolution: start fully review-gated, and only after you trust a specific surface,
add a narrow, separately-flagged path that sends without per-item approval for a defined,
low-blast-radius case. Add the second enqueue site *deliberately and named*, never by drift.

## In this folder

- [`reference/`](./reference): a small, runnable TypeScript implementation: a review queue,
  the single enqueue chokepoint, a gated dispatcher with global + per-surface switches and a
  daily cap, a generic surface adapter, an audit log, and a `demo()` that walks a draft from
  agent output to sent (and shows it staying put while the switch is off).
- [`skill/`](./skill): an installable skill that teaches an agent to design new
  side-effecting capabilities behind this boundary by default.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
