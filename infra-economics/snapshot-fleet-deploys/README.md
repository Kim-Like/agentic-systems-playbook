# Snapshot-based deploys for a fleet

> Shipping many sites or services together, especially when agents build them in parallel, needs
> a deploy model that cannot half-apply and cannot silently roll back. Build in an isolated
> workspace, freeze an immutable snapshot, deploy it atomically, guard against a deploy that
> would discard newer work, and prune old snapshots automatically. The unit you ship is a frozen
> artifact, not a live working directory.

This is the deploy half of owning your infrastructure, and the operational counterpart to
[capability-gated deploys](../../governing-agents/capability-gated-deploys). That pattern governs
*who* ships and refuses clobbering *requests*; this one governs *how* the ship itself is safe:
what you build, what you freeze, and how the swap happens.

## The problem

Deploying one thing from your working directory is fine. Deploying a fleet (several sites or
services that should move together) from working directories, while more than one agent edits in
parallel, is a minefield:

- **Half-applied deploys.** A deploy that updates three of six services and then fails leaves the
  fleet in a state that never existed in testing. Now you are debugging a combination nobody
  built.
- **Built from a moving target.** If you build straight from the live working directory, whatever
  else is sitting in that directory (another agent's half-done change, a stale edit) ships too,
  silently bundled with your deploy.
- **Silent rollback.** An agent deploys an artifact built from last week's state and quietly
  reverts everything shipped since. The deploy "succeeds"; the fleet goes backwards.

All three come from the same root: shipping a *live, mutable* directory instead of a *frozen,
known* artifact.

## The pattern

Five moves. Together they make a fleet deploy boring.

**1. Build in an isolated workspace.** Each unit of work happens in its own clean workspace,
cloned from the currently-deployed state, not in the shared canonical tree. So an in-progress
change cannot accidentally bundle whatever else is lying around, and two agents building at once
do not stomp each other's build inputs. The workspace is private and disposable.

**2. Freeze an immutable snapshot.** From the workspace, capture a snapshot: the complete,
versioned, content-addressed artifact (files plus their hashes plus the base it was built from).
Once frozen it never changes. The snapshot, not the workspace, is the unit you deploy. You can
point at exactly what shipped because it is a fixed thing with an id, not a directory that has
moved on since.

**3. Deploy atomically.** Apply the whole snapshot or none of it. The classic shape is to stage
the new version fully, then flip a single pointer (a symlink, a router, a version marker) in one
operation. If staging fails, the live pointer never moved and nothing is half-applied. The fleet
is only ever on one complete snapshot or the previous complete snapshot, never a partial mix.

**4. Guard against rollback and clobber.** Before deploying, compare the snapshot's base against
what is live now. If deploying it would move the fleet *backwards* (its base is behind current,
so it would discard work shipped since), refuse, unless a human explicitly says "yes, roll back".
The default is safe (no accidental reversion); the override is loud and deliberate. This is what
saves you when an agent ships a snapshot built from a stale base.

**5. Prune automatically.** Keep the last N snapshots for fast rollback, and drop the rest on a
schedule. Snapshots are cheap to keep a few of and expensive to keep all of; an unbounded
snapshot store is its own outage waiting to happen (a full disk). Bound it as part of the deploy,
not as a chore you forget.

## Why immutable + atomic is the whole thing

The two properties carry the pattern. **Immutable** means "what shipped" is answerable forever:
you can diff two snapshots, roll back to a known-good one exactly, and never wonder whether the
directory changed under you. **Atomic** means the fleet is never in an in-between state you did
not build: every observer sees the old complete version or the new complete version, never a
half-swapped mix. Lose immutability and rollback becomes guesswork; lose atomicity and a failed
deploy becomes a debugging session on a state that never existed. Everything else (workspaces,
the rollback guard, prune) protects those two.

## Re-deploy is the recovery path, not patch-in-place

When something is wrong with the live fleet, the fix is to build a new snapshot and deploy it,
not to hand-edit the deployed files. A live deployment edited by hand is no longer the snapshot
it claims to be; the next deploy will overwrite your fix and you will be confused about why. Keep
the deployed state a faithful copy of a snapshot, always. If you find yourself editing live
files, that is the signal to build and ship a snapshot instead.

## When NOT to use this

- **A single service deployed serially** by one shipper. The full snapshot-and-prune machinery is
  overhead; a normal deploy is fine. This earns its keep with a *fleet* and with *parallel*
  builders.
- **Stateless, instantly-reversible deploys** (a static asset push behind a CDN you can purge)
  where atomicity and rollback are already handled by the platform. Do not rebuild what your
  platform gives you.
- **Do not let the workspace model leak into a habit of editing canonical files** "just this
  once". The isolation only works if the build always happens in a workspace and the live state
  always comes from a snapshot.

## In this folder

- [`reference/`](./reference): a runnable snapshot deploy lifecycle. An isolated `Workspace`
  cloned from current, `freeze()` into an immutable content-addressed `Snapshot`, an atomic
  `deploy()` (stage-then-flip) with a **rollback guard** that refuses a snapshot built from a
  stale base unless `allowRollback`, and `prune()` that bounds the store. The `demo()` ships a
  snapshot, has a second agent's stale snapshot refused (then rebuilt onto current and shipped),
  shows a failed stage leaving the live pointer untouched, and prunes the old snapshots.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
