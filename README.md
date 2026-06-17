# Agentic Systems Playbook

Field-tested patterns for building and operating autonomous AI agents in production.

Most agent content stops at "look what it can do." This library is about what happens after: how you let an agent act on its own without losing control of it, how you prove what it did, and how it behaves when the inputs are not the ones you tested. These are patterns I actually run, rebuilt here from scratch as generic, reusable methodology.

New entries land roughly twice a week. Available entries link out; the rest are on the way.

## The library

### Governing autonomous agents (the boundary work)
_The agent is not the hard part. The boundary is. Governance is the engineering._

- **[Review-gated autonomy](./governing-agents/review-gated-autonomy)** — Let an agent do real work autonomously while guaranteeing nothing reaches the outside world without a recorded human act. **available**
- The single-enqueue invariant — Funnel every side-effecting write through ONE auditable function, and enforce it with a test/grep so a future contributor cannot add a second path. _coming_
- Kill-switches that ship OFF — Design every new capability as inert-by-default and fully reversible: a global master plus per-capability flags, defaulting OFF, where flipping everything OFF reverts to manual with zero data loss. _coming_
- Reading guide: how to adopt these patterns in order — A meta-node: the recommended adoption path through the playbook for someone starting an agent system today, so the library is a course, not a pile. _coming_
- Capability-gated deploys (one integrator) — When many agents can produce changes, only ONE holds the capability to ship. _coming_
- Sandboxing a tool-enabled subprocess — When your app spawns an agent subprocess on behalf of an external user, lock it down: isolated HOME, plan/read-only permission mode, an explicit disallowed-tools list, no inherited credentials. _coming_

### Reliability over demos
_A demo proves it can. Production proves it does, again, on the bad input, at 3am._

- **[The demo-to-production gap](./reliability/demo-to-production-gap)** — Why agents that pass ten clean demo runs fail silently in week three: the inputs change and the agent does not error, it produces plausible-but-wrong output. **available**
- Auditable or it doesn't ship — Every agent action writes a non-secret audit row: what, when, on which surface, with the external reference id. _coming_
- Idempotent, claim-based work queues — Run multiple workers against one queue without double-sending: an atomic claim (compare-and-set to 'sending'), idempotent enqueue (no duplicate pending rows), and lost-race handling that is a silent skip, not an error. _coming_

### Memory & knowledge for agents
_An agent with unbounded, unaged memory drifts. Bounded, recency-disciplined knowledge is what keeps it sharp._

- **[Bounded, recency-banded memory](./memory-knowledge/bounded-recency-memory)** — Keep an agent's knowledge sharp: domain-scope new claims, dedupe (token-set similarity + containment), cap the active set with compaction, and band by freshness (fresh / aging / outdated) where age clocks from when the agent LEARNED it. **available**
- The soul/memory split — Separate an immutable voice/values spine (read-only, re-distilled by hand) from an evolving knowledge store the learning loop writes. _coming_
- Two-tier learning loop (cheap triage, expensive synthesis) — Spend tokens where they matter: a cheap local model triages a large stream for relevance; only the kept items reach the expensive synthesis tier, bounded by a per-run cap. _coming_

### Persona & content systems
_When an agent writes in your voice, the spec is the product and the guardrails must be deterministic._

- Deterministic content guardrails — Stop relying on the model to follow style rules. _coming_
- Persona-as-spec (the spec is the product) — Treat the agent's behavior spec as the deliverable: prompts re-read the spec on every call, so editing the spec changes behavior with no deploy. _coming_
- Operator-in-the-loop review UI — The interface that makes review-gating humane: one card per draft, edit-in-place, approve/request-changes/archive, and a manual-publish attestation that records a human act without performing one. _coming_

### Running work as a system (orchestration)
_Throughput was always the goal, not headcount. The constraint moved to how good the system is._

- The dispatch-envelope contract — Hand work between agents (or contexts) through a typed envelope: the child gets exactly the inputs it needs and the parent never inherits the child's working context. _coming_
- Knowledge-graph routing — Route work to the right program/agent/model-tier with a small knowledge graph: nodes carry keywords/paths/status, and an orientation step injects only the relevant slice at session start instead of loading everything. _coming_
- Model-tier routing — Pick the cheapest sufficient model per task class: trivial mechanical work to a small model, bulk drafting to one tier, judgment to the top tier. _coming_

### Owned-infrastructure economics
_Owning the stack is a cost-and-control argument made with numbers, not nostalgia._

- Build vs buy for agentic infrastructure — An honest decision framework for self-hosting vs SaaS in an agent stack: what to own (queues, local models, your data plane), what to rent, and the failure modes you take on with each. _coming_
- Snapshot-based deploys for a fleet — Ship many sites/services together safely: build in an isolated workspace, deploy atomically from an immutable snapshot, guard against rollback/clobber, and prune old snapshots automatically. _coming_

### Field notes (essays + building-in-the-open)
_Short, honest takes and a real changelog of what changed and why._

- **[Field note: the honest middle on agent hype](./field-notes/2026-06-the-honest-middle.md)** — Short recurring essays that correct both the overclaim and the dismissal, from a practitioner running this daily. **available**
- Building in the open: the changelog — A public 'what changed in how I run agents this week, and why' log. _coming_

### Showcase (case studies)
_Proof, not bragging: real public builds, what they do for users, and the method, with backlinks._

- **[Danmarks Kaffekort (thirdwave.dk) case study](./showcase/danmarks-kaffekort)** — A curated interactive map of Denmarks best specialty coffee bars as a content-growth feature. **available**

## What this is and is not

It **is** methodology you can apply, with code you can read and adapt. It is **not** a copy of my production systems, and nothing here describes how my own infrastructure is wired or reached. Read the reference code as a starting point, then adapt it to your stack.

## About the author

Written and maintained by **Kim Like**, an AI and automation consultant who builds and runs autonomous agents in production. Consultancy: [aienterprise.dk](https://aienterprise.dk). See [AUTHORS](./AUTHORS.md).
