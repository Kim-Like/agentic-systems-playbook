# The soul/memory split

> Let your agent learn, but never let the learning loop edit who it is. Split the immutable
> spine (voice, values, the positions it argues from) from the evolving knowledge it
> accumulates. One is hand-authored and read-only. The other grows on its own. Keep them apart
> and a bad day for the learning loop can corrupt what the agent knows, never what it is.

This is the structural decision behind [bounded, recency-banded memory](../bounded-recency-memory).
Bounding the memory keeps the knowledge sharp. Splitting it from the soul keeps the knowledge
from ever overwriting the identity.

## The problem

An agent that learns is an agent that writes to itself. The moment a loop can append to the
thing the agent reads on every call, you have to ask: can the loop change the agent's
personality, its values, its refusals? If the same store holds both "here is how you write and
what you stand for" and "here is what you learned this week", then yes, a bad summary, a
poisoned input, or a drift over hundreds of small updates can quietly rewrite the agent into
something off-voice or off-values, and you will not notice until it says something it never
should have.

Mixing the two also makes the agent's character non-reproducible. If identity lives in a
mutable store that the loop has been editing for months, you cannot say what the agent *is* without
replaying its entire history. That is not an identity; it is an accident.

## The pattern

Two stores, two write models, one read path.

**The soul: immutable, hand-authored, read-only to the loop.** A single source of the agent's
voice, values, and the positions it argues from. It is written and revised *by a human*, under
review, like a spec. The learning loop reads it and never writes it. It changes only when a
person deliberately re-authors it, never as a side effect of the agent operating. This is the
agent's constitution: stable, inspectable, and the same today as yesterday unless someone
changed it on purpose.

**The memory: evolving, machine-written, bounded.** Everything the agent learns: facts,
observations, claims, summaries. The loop writes here freely (under the bounding rules:
scope, dedupe, cap, recency). This store is *expected* to change constantly. It is knowledge,
not character.

**One read path, two clearly-separate inputs.** When the agent acts, it reads the soul as its
spine and the memory digest as its current knowledge, as two distinct blocks, in that order:
identity first, then what it happens to know right now. The model can see both; it can only
ever have *written* one.

## The guarantee, and how you enforce it

The whole value is the guarantee "the learning loop cannot change the agent's identity". Make
it structural, not a promise:

- **No write path.** The loop has no function, no permission, no code path that writes the soul.
  It is read-only at the file/permission level, not just by convention. If the only way to change
  the soul is a human editing it under review, the loop *cannot* drift it, however it
  misbehaves.
- **Checksum it.** Record the soul's hash. If it ever changes without a human's deliberate
  revision, that is an alarm, not a shrug. A changed identity is a security and quality event.
- **Re-distill, do not append.** When the soul should evolve (the agent's positions genuinely
  mature), a human re-authors it from the spec. You do not let the loop "learn its way" into a
  new personality by accretion. Character is curated; knowledge is grown.

## Why this specific split and not "just be careful"

Because "be careful" does not survive contact with an autonomous loop running thousands of times
unattended. The split converts a behavioral hope ("the loop probably will not corrupt the
persona") into a structural fact ("the loop has no way to"). It also makes the agent
reproducible: its identity is one reviewed artifact you can read, diff, and roll back, entirely
separate from the churn of what it has learned.

## When NOT to use this

- **Stateless agents** with no learning loop. There is nothing writing to the agent; there is
  nothing to protect. Add the split the day you add a memory the agent writes.
- **A pure knowledge base** with no persona (a retrieval system answering from documents). There
  is no "soul" to separate; the documents are the point. The split is for agents that have a
  voice and values worth protecting.
- **Do not over-split.** Two stores (identity, knowledge) is the cut that matters. Slicing the
  persona itself into ten governed fragments is ceremony; keep the soul one coherent,
  human-authored artifact.

## Related

This is the foundation under [bounded, recency-banded memory](../bounded-recency-memory) (how the
*knowledge* half stays sharp) and a sibling of [persona-as-spec](../../content-systems) (treating
the soul as a re-readable spec so a human can revise the identity without a deploy).

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
