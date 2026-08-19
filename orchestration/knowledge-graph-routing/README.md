# Knowledge-graph routing

> Do not load your whole system into every agent session. Keep a small graph of what exists
> (programs, agents, topics, each with keywords and paths) and an orientation step that injects
> only the slice a session actually needs. The agent starts oriented and lean, instead of
> drowning in everything.

As an agent system grows, the naive approach is to put everything the agent might need into its
context: every program's docs, every convention, the whole map. That works at three components
and collapses at thirty. This pattern routes instead: a lightweight graph decides what is
relevant to the task at hand, and only that is loaded.

## The problem

A capable agent system accumulates surface: many programs, many agents, many conventions, many
docs. If every session loads all of it "so the agent has context", you pay for it three ways.
The context window fills with mostly-irrelevant material, so the relevant part competes for
attention with noise. Cost and latency climb with the size of your whole system rather than the
size of the task. And the agent's behavior gets less reliable, not more, because a model given
ten times the necessary context reasons worse, not better. More context is not more capability
past the point where it is mostly noise.

## The pattern

A small routing graph, plus an orientation step that runs before the real work.

**1. A graph of what exists, with routing keys.** Maintain a compact, structured map: the nodes
are the things a session might need to engage (a program, an agent, a topic, a surface), and
each node carries lightweight routing keys: keywords it matches, paths it owns, its status, and
a pointer to where its detail lives. The graph is small by design (it is an index, not the
content) and cheap to keep current.

**2. An orientation step that selects the slice.** When a session starts, a routing step reads
the task (and any paths involved), matches it against the graph's keys, and selects the relevant
nodes. It then injects only those: this program's conventions, this agent's contract, this
topic's notes. The rest of the system stays out of the window entirely. The agent begins
oriented to exactly its task.

**3. Detail loads lazily, by reference.** The graph holds pointers, not bodies. A node says
"detail is here"; the orientation injects the index entry, and the full detail is fetched only
if and when the task reaches it. So even the selected slice starts as a summary and deepens on
demand, rather than dumping everything relevant up front.

## Why a graph and not just search

You could embed everything and retrieve by similarity. For routing, a small explicit graph often
beats that: it is cheap (no embedding step on every session), it is inspectable (you can read why
a task routed where it did), and it is precise on the things that should be exact, like which
paths belong to which program. Semantic search is great for "find me content like this"; graph
routing is better for "which part of my system owns this task". Use search inside a node's
content if you need it; use the graph to decide which node.

## Keep the graph small and the detail elsewhere

The discipline that makes this work: the graph is an *index*, never the content. The moment you
start putting full docs into the graph, it becomes the everything-blob you were avoiding, just in
a new file. Nodes carry keywords, paths, status, and a pointer. Detail lives in the program, the
agent packet, the topic notes, loaded only when routed to. A routing graph you can read in one
screen is doing its job; one that has grown into a manual is not.

## When NOT to use this

- **A small system.** Three programs and a handful of conventions fit in context comfortably;
  routing is overhead. Add it when "load everything" starts to hurt, which is a real, noticeable
  moment.
- **A single-purpose agent** that always does the same job with the same context. There is
  nothing to route between. The pattern is for a system with many distinct things a session might
  engage.
- **Do not let the graph drift from reality.** A routing graph that points at things that moved
  or no longer exist routes sessions wrong, which is worse than no routing. If you cannot keep it
  current cheaply, shrink it until you can.

## In this folder

- [`reference/`](./reference): a runnable router. A small graph of nodes (each with keywords,
  paths, status, and a detail pointer), a `route()` that scores a task against the graph and
  returns the relevant slice, and an `orient()` that produces the compact context to inject. The
  `demo()` routes several tasks, shows each getting only its relevant nodes (not the whole graph),
  and shows detail being a lazy pointer rather than inlined content.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
