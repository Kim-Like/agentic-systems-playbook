# Getting started: a reading path

This library is a course, not a pile. If you are standing up an agent that does real work, adopt
these patterns in this order. Each builds on the one before it, and the order is deliberate:
govern the agent first, make it reliable, then make it remember well, then let it write.

You do not need all of them on day one. You need them in roughly this sequence as the agent
takes on more.

## 0. Before anything: are you about to give the agent a side effect?

If the agent only reads and drafts, you are safe and can move slowly. The moment it can send,
post, deploy, or spend, start at step 1 the same day. The whole foundation is about that moment.

## 1. Put a boundary around acting

**[Review-gated autonomy](../governing-agents/review-gated-autonomy).** The pattern everything
else sits on: a review queue, one chokepoint that can act, a kill-switch that ships OFF, and a
manual path that loses nothing when you turn it all off. Build this first. Until it exists, the
agent either cannot act or can act unsafely; there is no good middle.

Then harden the boundary with its two siblings:

- **[The single-enqueue invariant](../governing-agents/single-enqueue-invariant).** Make the one
  place that can act actually stay one place, with a test that fails on drift.
- **[Kill-switches that ship OFF](../governing-agents/kill-switches-ship-off).** Add every new
  capability inert-by-default and reversible, so you roll it out deliberately.

## 2. Make it reliable

An agent that acts will eventually act on the wrong input or be run by two workers at once.

- **[The demo-to-production gap](../reliability/demo-to-production-gap).** Catch the silent
  failures: validate input at the boundary, watch output against a baseline.
- **[Auditable or it doesn't ship](../reliability/auditable-or-it-doesnt-ship).** Write a
  non-secret trace of every action, success and failure, so you can reconstruct what happened.
- **[Idempotent, claim-based work queues](../reliability/idempotent-claim-queues).** The day you
  run more than one worker, claim atomically so nothing is sent twice.

## 3. Make it remember well (only if it learns)

Skip this entirely if your agent is stateless. The moment it keeps knowledge between runs:

- **[The soul/memory split](../memory-knowledge/soul-memory-split).** Separate the immutable
  voice/values from the evolving knowledge, so the learning loop can never rewrite who the
  agent is.
- **[Bounded, recency-banded memory](../memory-knowledge/bounded-recency-memory).** Keep the
  knowledge half sharp: scope, dedupe, cap, and age it from when it was learned.

## 4. Make it write safely (only if it writes for you)

If the agent produces text that ships under your name:

- **[Deterministic content guardrails](../content-systems/deterministic-content-guardrails).**
  Put a hard gate after generation for your non-negotiable rules: one retry, then refuse.

## 5. Keep the loop honest

- **[Field notes](../field-notes)** are the ongoing record: short essays and a building-in-the-open
  change log of what changed in how the system runs, and why.

## The one-sentence version

Govern acting before you optimize it, make failures visible before they compound, separate what
the agent *is* from what it *knows*, and never let a probabilistic model be the last check on a
non-negotiable rule.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
