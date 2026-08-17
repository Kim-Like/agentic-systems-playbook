# The dispatch-envelope contract

> Multi-agent work falls apart when contexts bleed. Hand work between agents through a typed
> envelope: the child gets exactly the inputs it needs and nothing else, and the parent never
> inherits the child's working context back. Small, explicit handoffs keep a multi-agent system
> composable and its context windows lean.

When one agent delegates to another (a parent spawning a sub-agent, an orchestrator handing a
task to a worker), the tempting shortcut is to pass everything: the whole conversation, the
parent's full state, "just in case the child needs it". That shortcut is why multi-agent systems
turn into a tangle. This pattern is the discipline that keeps delegation clean.

## The problem

Two failure modes, both from contexts bleeding into each other.

**The child inherits too much.** Pass the parent's entire context to the child and you get
bloat (the child's window fills with irrelevant parent history, costing tokens and diluting
attention), coupling (the child now depends on the shape of the parent's state, so neither can
change freely), and leakage (the child can see things it had no business seeing). The child was
supposed to do one scoped job; instead it carries the parent's whole world.

**The parent inherits the child back.** When the child finishes and dumps its full working
context back into the parent (everything it read, every intermediate step, its scratch
reasoning), the parent's context now swells with the child's mess. Do this across several
delegations and the orchestrator's window is a landfill of sub-agent transcripts, and you have
lost the thing that made delegation worth it: keeping each agent's context small and focused.

## The pattern

A typed envelope in each direction, and a hard rule about what crosses.

**1. The request envelope: only the inputs, explicitly.** The parent hands the child a typed
object containing exactly what the job needs: the task, its specific inputs, the constraints,
and nothing else. Not the conversation, not the parent's state, not "context that might help".
If the child needs something, it is a named field on the envelope, added deliberately. The
envelope is the complete, sufficient brief.

**2. The result envelope: only the outputs, explicitly.** The child returns a typed object with
its result and a short, structured summary, not its transcript. The parent receives the answer,
not the work. The child's scratch context, its intermediate steps, its reasoning, all of it
stays in the child and is discarded when the child is done.

**3. The hard rule: the parent never inherits the child's working context.** This is the line
that keeps the system composable. The child runs in its own context, does its job, returns a
clean result, and evaporates. The parent's context grows only by the size of the result
envelope, never by the size of the child's entire run. You can delegate ten times and the
parent stays lean.

## Why typed, and why explicit

The envelope is *typed* (a defined shape, validated) so the contract between parent and child is
visible and stable: you can read what a job requires and what it returns without reading either
agent's implementation. It is *explicit* (you list the fields) so adding a new input is a
deliberate decision, not an accident of "I passed everything so it is probably in there". The
discipline of naming each field is what stops the bleed. The moment you pass "the whole context
to be safe", the contract is gone and the coupling is back.

## This is the multi-agent version of two earlier patterns

- It is [the single-enqueue invariant](../../governing-agents/single-enqueue-invariant) applied
  to *context*: instead of one chokepoint for side effects, a defined boundary for what crosses
  between agents.
- It pairs with [capability-gated deploys](../../governing-agents/capability-gated-deploys):
  there, an agent files a typed request and walks away; here, every delegation is a typed
  request and a typed result. Same shape, generalized to all cross-agent work.

## When NOT to use this

- **A single agent with no delegation.** There is no handoff, so there is no envelope. The
  pattern starts mattering the moment one agent hands work to another.
- **Tightly-coupled steps that are really one job.** If two steps share so much state that
  splitting them means threading a huge envelope back and forth, they may not be two agents.
  Keep them one. The envelope should be small; if it is not, reconsider the split.
- **Do not over-formalize a quick internal helper.** A pure function call is not a dispatch.
  The envelope is for genuine agent-to-agent handoffs, not every function boundary.

## In this folder

- [`reference/`](./reference): a runnable dispatcher. A parent builds a typed `RequestEnvelope`
  (task + named inputs only), a child runs against just that envelope and returns a typed
  `ResultEnvelope` (output + summary, not its transcript), and the dispatcher enforces that the
  parent's context grows only by the result, never by the child's working context. The `demo()`
  delegates several tasks and shows the parent staying lean while each child runs in isolation.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
