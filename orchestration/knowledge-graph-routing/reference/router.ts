/**
 * Knowledge-graph routing, a runnable reference.
 *
 * A small graph indexes what exists (programs, agents, topics, conventions), each
 * node carrying routing keys: keywords, owned paths, status, and a POINTER to where
 * its detail lives. `route()` scores a task against the graph; `orient()` injects
 * only the matched slice as compact index lines, never the whole graph and never the
 * full detail (which loads lazily, by reference).
 *
 * From scratch, no dependencies. Run it:  npx tsx router.ts
 */

interface GraphNode {
  id: string;
  kind: "program" | "agent" | "topic" | "convention";
  keywords: string[];
  /** Path prefixes this node owns. An exact, high-signal routing key. */
  paths: string[];
  status: string;
  /** Where the full detail lives. A POINTER. The graph stays an index, not the content. */
  detailRef: string;
}

// A compact graph. It is an INDEX: keywords, paths, status, a pointer. Not the docs.
const GRAPH: GraphNode[] = [
  { id: "content-pipeline", kind: "program", keywords: ["content", "pipeline", "ranking", "publish"], paths: ["content/"], status: "active", detailRef: "programs/content-pipeline/README" },
  { id: "auth-service", kind: "program", keywords: ["auth", "credential", "login", "token"], paths: ["auth/"], status: "active", detailRef: "programs/auth/README" },
  { id: "billing", kind: "program", keywords: ["billing", "invoice", "payment"], paths: ["billing/"], status: "active", detailRef: "programs/billing/README" },
  { id: "reliability-notes", kind: "topic", keywords: ["reliability", "incident", "retry", "failure"], paths: [], status: "reference", detailRef: "topics/reliability.md" },
  { id: "secrets-handling", kind: "convention", keywords: ["credential", "secret", "rotate", "token"], paths: [], status: "policy", detailRef: "conventions/secrets.md" },
  { id: "writer-agent", kind: "agent", keywords: ["write", "post", "draft", "blog", "content"], paths: [], status: "active", detailRef: "agents/writer/AGENT" },
];

interface Task {
  text: string;
  /** Paths the task touches, if known. Exact path matches score highest. */
  paths?: string[];
}

interface Match {
  node: GraphNode;
  score: number;
}

/** Score each node against the task; return the relevant ones, strongest first. */
function route(graph: GraphNode[], task: Task): Match[] {
  const text = task.text.toLowerCase();
  const taskPaths = task.paths ?? [];
  return graph
    .map((node) => {
      let score = 0;
      for (const kw of node.keywords) if (text.includes(kw)) score += 2;
      for (const p of node.paths) if (taskPaths.some((tp) => tp.startsWith(p))) score += 3;
      return { node, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Produce the compact orientation to inject: index lines for the matched slice only. */
function orient(matches: Match[]): string {
  if (matches.length === 0) return "(no matching nodes; proceed with base context only)";
  return matches
    .map((m) => `- [${m.node.kind}] ${m.node.id} (${m.node.status}) -> detail: ${m.node.detailRef}`)
    .join("\n");
}

/** Detail is fetched lazily, only when the task actually reaches a node. */
function loadDetail(ref: string): string {
  return `<<full detail of ${ref}, loaded on demand>>`;
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

function runTask(task: Task): void {
  const matches = route(GRAPH, task);
  console.log(`\nTask: "${task.text}"${task.paths ? ` (paths: ${task.paths.join(", ")})` : ""}`);
  console.log(`  routed to ${matches.length} of ${GRAPH.length} nodes:`);
  console.log(orient(matches).split("\n").map((l) => "  " + l).join("\n"));
}

function demo(): void {
  console.log(`Graph: ${GRAPH.length} nodes (an index of the whole system).`);

  runTask({ text: "fix the ranking in the content pipeline" });
  runTask({ text: "rotate a credential for the auth service", paths: ["auth/config"] });
  runTask({ text: "write a blog post about reliability" });

  console.log("\nLazy detail: the orientation injected POINTERS, not docs. Detail loads on demand:");
  const m = route(GRAPH, { text: "write a blog post about reliability" });
  console.log(`  e.g. ${loadDetail(m[0].node.detailRef)}`);

  console.log(
    "\nEach session started oriented to ~2 of 6 nodes, as compact index lines, with detail " +
      "behind pointers. The agent's window holds its task's slice, not the entire system."
  );
}

demo();

export { route, orient, loadDetail, GRAPH };
export type { GraphNode, Task, Match };
