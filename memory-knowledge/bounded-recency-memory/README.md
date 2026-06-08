# Bounded, recency-banded memory

> An agent that remembers everything, forever, with equal weight, gives you confident answers
> built on things that stopped being true months ago. Bounding and aging the memory is not a
> storage optimization. It is what keeps the agent correct.

If your agent learns over time (it reads, it summarizes, it keeps notes for later), you have a
memory store, and a memory store left ungoverned has three failure modes: it **drifts** (old
claims outvote new reality), it **bloats** (the context you inject grows without bound), and
it **duplicates** (the same claim, slightly reworded, ten times, drowning out everything
else). This pattern governs all three.

## Four rules

A claim only earns a place in memory if it passes all four. Together they keep the store
small, current, and trustworthy.

### 1. Domain-scope on the way in

Decide, up front, what this agent's memory is *about*, and reject claims outside that scope at
write time. A consulting agent does not need to remember sports scores it happened to read. An
unscoped memory becomes a junk drawer, and a junk drawer injected into a prompt is noise that
crowds out signal. Scope is the cheapest quality control you have.

### 2. Dedupe against what is already known

Before adding a claim, check it against the active set. Near-duplicates do not just waste
space; they bias the agent, because a claim repeated ten times reads as ten independent
confirmations. Two cheap measures together catch most of it:

- **Token-set similarity** (Jaccard): the overlap of the two claims' word sets.
- **Containment**: whether the smaller claim's words are mostly a subset of the larger one
  (catches the case where one claim is a verbose restatement of another, which similarity
  alone underrates).

If either crosses its threshold, treat the new claim as a duplicate: keep the stronger one,
drop or merge the other.

### 3. Cap the active set, with compaction

Set a hard ceiling on how many claims are *active* (injected into the prompt). When you exceed
it, compact: archive the weakest claims (lowest confidence, then oldest) until you are back
under the cap. Archived claims are not deleted; they leave the working set. A bounded working
set keeps the injected context human-readable and stops the prompt from drifting into an
unbounded blob.

### 4. Band by freshness, and age from when you LEARNED it

Give every claim a freshness band from its age:

- **fresh** (recent): top of the digest, quoted first.
- **aging** (older): lower weight, verify before leaning on it.
- **outdated** (old): excluded from the digest entirely, kept in the table.

The subtle, important choice: **age from when the agent learned the claim, not from when the
source was published.** A claim ages from *consumption*. If the agent learned something three
months ago, it is stale to the agent regardless of when the underlying article was written,
because the agent has not re-confirmed it since. "If a take of mine reads as outdated, the
take is wrong" is a rule you can enforce mechanically by banding on learned-at.

## The digest is the injection surface

You do not inject the raw table into the prompt. You render a **digest**: the fresh band
first, the aging band below it (flagged as lower-weight), and the outdated band excluded. The
digest is what the agent actually reads, so all the governance above exists to make the digest
small, current, and dense. Regenerate it whenever memory changes.

## Why each rule

- **Scope** keeps the signal-to-noise ratio high at the only point it is cheap to enforce:
  the write.
- **Dedupe** stops repetition from masquerading as corroboration.
- **Cap + compaction** make the cost of injection bounded and predictable, instead of growing
  with every run until it crowds the prompt or the budget.
- **Recency banding from learned-at** is what actually fights drift: the agent's confidence in
  a claim decays unless it keeps re-learning it.

## When NOT to use this

- **Stateless agents.** If the agent does not carry knowledge between runs, there is no memory
  to bound. Add this the day you give it one.
- **Ground-truth records** (an audit log, a transaction history, a system of record). Those
  must be complete and immutable; never compact or age them. This pattern is for an agent's
  *learned beliefs*, not for facts of record. Keep the two stores separate.
- **Very small memories** well under the cap: scope and dedupe still pay off; the cap and
  banding can wait until volume justifies them.

## In this folder

- [`reference/`](./reference): a runnable `MemoryStore` with domain-scope, Jaccard +
  containment dedupe, a capped active set with compaction, freshness banding by learned-at,
  and a `digest()` that emits fresh + aging and excludes outdated. The `demo()` adds claims,
  rejects an out-of-scope one, merges a near-duplicate, trips the cap to force compaction, and
  ages a claim out of the digest.
- [`skill/`](./skill): an installable skill that teaches an agent to put any new memory store
  behind these four rules by default.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
