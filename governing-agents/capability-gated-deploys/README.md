# Capability-gated deploys (one integrator)

> The moment more than one agent can ship, you need a deploy authority: exactly one holder of
> the ship capability, and everyone else files a request. The authority integrates onto what is
> live now, refuses any ship that would clobber someone else's work, verifies, and records. It
> removes an entire class of failure: the agent that shipped over another agent's deploy.

[Review-gated autonomy](../review-gated-autonomy) governs whether an action is allowed.
[The single-enqueue invariant](../single-enqueue-invariant) makes "who can act" answerable.
This pattern is what those become when the action is **deploy** and there is **more than one
agent** producing changes at once.

## The problem

With one developer and one deploy, "ship" is simple. Add a second agent (or a second person, or
a parallel workstream) that can also deploy, and you get a race with permanent consequences:
Agent A builds from the current state and ships. Agent B, who started from the same state before
A shipped, also ships, and B's deploy quietly overwrites A's, because B's artifact was built
from a world that no longer exists. Nobody did anything wrong locally. The system just let two
parties write the live state from stale bases, and the later writer won by accident.

This is worse than the queue double-send, because a deploy is not idempotent and not easily
replayed. A clobbered deploy is lost work that looked successful.

## The pattern

Centralize the *capability to ship*, and make every ship go through an integration step that
cannot clobber.

**1. One holder of the ship capability.** Exactly one component (the "deploy authority") can
perform the actual deploy. Not "should"; *can*. Everyone else, including every agent, is
technically unable to ship directly. The capability is a gate, enforced, not a convention. If
an agent could bypass it "just this once," it is not a capability gate.

**2. Everyone else files a typed deploy request.** A request is an envelope, not a push: who is
asking, what they want to ship and why, and crucially **the base it was built from** (the
version/snapshot/commit the artifact assumes). The base is what makes clobber detection
possible. An agent does not deploy; it submits a request and walks away.

**3. The authority integrates onto current and refuses to clobber.** When the authority picks up
a request, it compares the request's base against what is live *now*. If live has advanced past
the base in a way that overlaps what the request changes, the authority **refuses** and tells
the requester to rebuild from current. It never silently overwrites newer work. Only when the
request integrates cleanly onto current does it ship.

**4. Verify, ship, record.** The authority verifies before and after (the thing built, the
deploy took, the surface is healthy), performs the one deploy, bumps the version, and writes an
audit row. One ship, one record, one place that did it.

## The handoff is the point

Notice what the requesting agent does NOT do: it does not wait, it does not watch, it does not
hold the capability "just for this deploy." It files the request and is done. The authority is
autonomous: filing the request is the entire handoff. This keeps the requesters simple and
keeps the dangerous capability in exactly one audited place. An agent that "temporarily takes
the ship capability to deploy its own work" has defeated the gate; the whole design is that it
never needs to.

## Why refuse instead of merge automatically

The authority could try to auto-merge a stale request onto current. Resist that for deploys.
Auto-merge is where silent clobbers hide: a merge that "succeeds" but drops a change is exactly
the failure you were eliminating. Refusing a stale request and making the requester rebuild from
current is louder, simpler, and safe. The requester re-runs against reality; nothing is lost.
Save cleverness for places where a mistake is cheap. A deploy is not one of them.

## When NOT to use this

- **A single shipper.** One agent or one person deploying serially does not need an authority;
  there is no second writer to clobber. Add it the day a second party can ship, which arrives
  with your second agent or your second workstream.
- **Trivial, isolated, instantly-reversible deploys** (a static toggle, a flag) where a clobber
  costs nothing and a rebuild is free. Gate the deploys that are expensive or hard to undo.
- **Do not turn it into a bottleneck queue with a human in every loop.** The authority should be
  automated: it integrates and ships without a person, and only *escalates* (alerts a human)
  when it genuinely cannot proceed safely. A gate that needs a human per deploy is just a slower
  clobber.

## In this folder

- [`reference/`](./reference): a runnable `DeployAuthority` that holds the ship capability,
  accepts typed deploy requests carrying their base, **refuses** a request whose base is stale
  where it overlaps live changes (naming the conflicting files), integrates clean requests,
  bumps the version, and records each ship. The `demo()` ships agent A, refuses agent B's stale
  overlapping request, lets B rebuild onto current and ship, and shows a direct-ship bypass
  being rejected because only the authority holds the capability.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
