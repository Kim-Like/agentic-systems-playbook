# Reference: router

A runnable router for [knowledge-graph routing](../README.md): a small graph of nodes with
routing keys, a `route()` that scores a task against it, and an `orient()` that injects only the
matched slice as compact index lines with lazy detail pointers.

## Run it

```bash
npx tsx router.ts
```

## What the demo shows

A 6-node graph (programs, an agent, a topic, a convention). Three different tasks each route to
**2 of 6** nodes:

1. "fix the ranking in the content pipeline" routes to the content-pipeline program and the
   writer agent.
2. "rotate a credential for the auth service" (with an `auth/` path) routes to the auth program
   and the secrets-handling convention, the path match scoring highest.
3. "write a blog post about reliability" routes to the writer agent and the reliability topic.

And detail is lazy: the orientation injected **pointers** (`detail: ...`), and the full content
loads only when `loadDetail` is called.

## What to copy

- The graph is an **index**: keywords, owned paths, status, and a pointer. Never the content.
- **Path matches score highest**, because "which program owns this path" should be exact.
- `orient()` injects **only the matched slice**, so a session starts with its task's context, not
  the whole system.
- Detail is **behind a pointer** and loads on demand, so even the selected slice starts as a
  summary and deepens only if the task reaches it.

## What this is not

Keyword-and-path scoring over an in-memory graph. A larger system might add weights, synonyms, or
a semantic search *inside* a node's content, and would keep the graph in a file it maintains. The
index-not-content discipline and the orient-to-the-slice step are the parts that transfer.
