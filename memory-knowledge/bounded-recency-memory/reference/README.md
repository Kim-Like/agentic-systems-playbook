# Reference: bounded memory store

A single-file `MemoryStore` implementing the four rules from
[bounded, recency-banded memory](../README.md): domain-scope, dedupe, cap + compaction, and
recency banding, plus the `digest()` that becomes the agent's prompt-injection surface.

## Run it

```bash
npx tsx memory-store.ts
```

(Any TypeScript runner works. No dependencies.)

## What the demo shows

1. Three in-domain claims are added.
2. An out-of-scope claim (a sports note for a reliability/governance agent) is **rejected at
   write time**.
3. A verbose restatement of an existing claim is detected by containment and **merged**, not
   stored twice. The active count stays distinct.
4. Two more claims trip the cap of four, and **compaction archives the weakest** (lowest
   confidence, then oldest).
5. A 120-day-old claim is added with the *highest* confidence in the store, yet the digest
   **excludes** it because it is outdated.

The closing note is the whole point: recency beats confidence in the digest. A high-confidence
belief the agent has not re-learned in months does not get injected. That is how you fight
drift mechanically.

## What to copy

- **Two dedupe measures, not one.** Jaccard catches reworded claims; containment catches the
  case where one claim is a verbose superset of another. Either tripping means duplicate.
- **Age from `learnedAt`, not from a source's publish date.** A belief ages from when the
  agent last took it on.
- **Compaction archives, it does not delete.** The claim leaves the working set; the record
  stays, so you can audit or revive it.
- **The digest is the only thing the prompt sees.** All the governance exists to keep the
  digest small, current, and dense.

## What this is not

In-memory, with simple token-set dedupe and a flat confidence score. A production version
persists to a datastore, may use embeddings for semantic dedupe, and runs banding on a
schedule. The four rules and the digest-as-injection-surface do not change.
