# Reference: deploy authority

A runnable `DeployAuthority` for [capability-gated deploys](../README.md): one holder of the
ship capability, typed deploy requests carrying their base, and a clobber guard that refuses a
stale request rather than overwriting newer work.

## Run it

```bash
npx tsx deploy-authority.ts
```

## What the demo shows

1. Agent A files a request built from v1; it integrates cleanly and live becomes v2.
2. Agent B files a request built from the **same old v1**, overlapping a file A already shipped:
   **refused**, with the conflicting file named. No silent clobber.
3. Agent B rebuilds from current (v2) and re-files; now it integrates and live becomes v3.
4. A direct-ship bypass is rejected, because nothing but the authority holds the capability.
5. The ship log: one record per real deploy, in order.

## What to copy

- The request carries the **base it was built from**; that is what makes clobber detection
  possible. Without it you cannot tell stale from fresh.
- The authority **refuses, it does not auto-merge.** Auto-merge is where silent clobbers hide.
  Refuse, and make the requester rebuild from current.
- The ship capability lives in **exactly one place.** A requester files and walks away; it never
  "borrows" the capability to ship its own work.
- **Verify is part of the path**, before the ship; a failing verify refuses rather than shipping
  a broken artifact.

## What this is not

In-memory, with file-version numbers standing in for real artifacts and a real deploy. A
production authority diffs against the live state of the actual surfaces, runs real pre/post
verification, performs the deploy, and escalates (alerts a human) when it cannot proceed safely
instead of blocking. The capability-gate, the base-carrying request, and the refuse-don't-clobber
rule are what transfer.
