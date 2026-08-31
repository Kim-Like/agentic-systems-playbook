# Reference: snapshot deploy

A runnable snapshot deploy lifecycle for [snapshot-based fleet deploys](../README.md): isolated
workspace, immutable content-addressed snapshot, atomic deploy, a rollback guard, and prune.

## Run it

```bash
npx tsx snapshot-deploy.ts
```

## What the demo shows

1. Agent A checks out an isolated workspace from current, edits, freezes a snapshot, and deploys;
   live advances a generation.
2. Agent B's snapshot, built from a stale base, is **refused by the rollback guard** (it would
   silently revert A's work) with a clear reason.
3. Agent B rebuilds from current and ships cleanly.
4. A broken snapshot (empty artifact) **fails to stage**, and the live pointer is left unchanged:
   no half-applied deploy.
5. `prune(3)` bounds the store, dropping the oldest snapshots while never pruning the live one.

## What to copy

- Build in an **isolated workspace** cloned from current, so an in-progress change cannot bundle
  whatever else is in the shared tree.
- The unit you deploy is an **immutable, content-addressed snapshot**, not a live directory, so
  "what shipped" is answerable forever.
- Deploy is **stage-then-flip**: validate fully, then move one pointer. A failed stage changes
  nothing.
- The **rollback guard** refuses a snapshot built from a base behind live, unless `allowRollback`.
- **Prune** as part of the deploy, and never prune the live snapshot.

## What this is not

In-memory, with a toy content hash and a "fleet" that is one pointer. A real implementation
snapshots files to durable storage, content-addresses with a real hash, performs the atomic flip
with a symlink or router swap across many services, and runs prune on a schedule. The five moves
and the immutable-plus-atomic core are what transfer. Pairs with
[capability-gated deploys](../../governing-agents/capability-gated-deploys) for *who* may ship.
