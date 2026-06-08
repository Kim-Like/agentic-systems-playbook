---
name: bounded-agent-memory
description: Use this when you are adding or designing a store of LEARNED BELIEFS that an agent carries between runs (notes it keeps, summaries it writes, things it "remembers" and later injects into its own prompt). It bounds the store so the agent stays correct: domain-scope on write, dedupe, a capped active set with compaction, and recency banding aged from when the claim was learned. Do NOT use it for a system of record (audit logs, transactions, facts of record), which must stay complete and immutable.
author: Kim Like
homepage: https://aienterprise.dk
source: https://github.com/Kim-Like/agentic-systems-playbook
license: MIT
---

# Bounded agent memory

When the task adds a place where an agent stores what it has learned and reads it back later,
do not store claims raw and unbounded. An ungoverned belief store drifts (stale claims outvote
current reality), bloats (the injected context grows without limit), and duplicates (a repeated
claim reads as repeated confirmation). Put it behind these four rules.

## When this applies

Apply it to an agent's **learned beliefs**: notes it writes for itself, summaries it keeps,
anything it remembers across runs and later injects into a prompt. Do NOT apply it to a
**system of record** (an audit log, a transaction history, anything that must be complete and
immutable). Keep those in a separate store and never compact or age them.

## The four rules

1. **Domain-scope on write.** Decide what this memory is *about* and reject out-of-scope
   claims at the moment they are added. Scope is the cheapest quality control, and the only
   one that is free to enforce.

2. **Dedupe before adding.** Compare a new claim against the active set with two measures:
   token-set similarity (Jaccard) and containment (is the smaller claim mostly a subset of a
   larger one). If either crosses its threshold, merge into the stronger claim rather than
   storing a near-duplicate. Repetition must not masquerade as corroboration.

3. **Cap the active set, with compaction.** Set a hard ceiling on how many claims are active
   (injected). When you exceed it, archive the weakest (lowest confidence, then oldest) until
   you are back under the cap. Archive, do not delete: the claim leaves the working set, the
   record stays.

4. **Band by freshness, aged from LEARNED-AT.** Give each claim a band from its age: fresh
   (quote first), aging (lower weight, verify before quoting), outdated (excluded from the
   prompt, kept in the table). Age from when the AGENT learned the claim, not from when the
   source was published. A belief the agent has not re-learned decays.

## The digest

Never inject the raw store. Render a digest: fresh band first, aging band below it flagged as
lower-weight, outdated excluded. The digest is the only thing the prompt reads. Regenerate it
whenever memory changes.

## Acceptance checks

- [ ] Out-of-scope claims are rejected at write time, not filtered later.
- [ ] A reworded or verbose-restatement duplicate merges, it does not add a second row.
- [ ] The active (injected) set never exceeds the cap; over it, the weakest are archived.
- [ ] A high-confidence but old claim is EXCLUDED from the digest. Recency beats confidence
      for what gets injected.
- [ ] Age is computed from learned-at, not source publish date.
- [ ] The system of record (if any) is a separate store that is never compacted or aged.

## Anti-patterns to refuse

- One unbounded table that is dumped into the prompt and grows every run.
- Deduping on exact-match only (misses the reworded restatement, which is the common case).
- Deleting on compaction instead of archiving (loses the audit trail and the ability to revive).
- Banding on the source's publish date (an old article re-read today is fresh knowledge; a
  claim learned long ago and never re-confirmed is stale even if its source is recent).
- Treating an audit log or transaction record as "memory" and aging or compacting it.

## Reference

A runnable implementation (domain-scope, Jaccard + containment dedupe, cap + compaction,
banding, and a digest renderer) is in the `reference/` folder of the `bounded-recency-memory`
entry in the agentic-systems-playbook.
