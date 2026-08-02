/**
 * Capability-gated deploys, a runnable reference.
 *
 * One holder of the ship capability (the DeployAuthority). Agents do not ship;
 * they file a typed deploy request carrying the BASE it was built from. The
 * authority integrates onto what is live now, REFUSES any request whose stale
 * base would clobber newer work (naming the conflicting files), and only then
 * ships, bumps the version, and records. Direct ship is impossible by
 * construction: nothing else holds the capability.
 *
 * From scratch, no dependencies. Run it:  npx tsx deploy-authority.ts
 */

interface DeployRequest {
  agent: string;
  intent: string;
  /** The live version this artifact was built from. The basis for clobber detection. */
  base: number;
  /** The files this request would change. */
  changes: string[];
}

interface ShipRecord {
  version: number;
  agent: string;
  intent: string;
  files: string[];
  at: number;
}

type SubmitResult =
  | { ok: true; version: number }
  | { ok: false; reason: string; conflicts: string[]; current: number };

class DeployAuthority {
  private version = 1; // the live version
  private fileVersion = new Map<string, number>(); // file -> version it was last shipped at
  private log: ShipRecord[] = [];
  private clock = 1_700_000_000_000;

  /** What is live right now. A requester rebuilds from this when refused. */
  current(): number {
    return this.version;
  }

  /**
   * THE ONLY SHIP PATH. Integrate a request onto current, or refuse it.
   * `verify` is the pre/post check (build is sound, surface healthy); a failing
   * verify refuses the ship rather than shipping a broken artifact.
   */
  submit(req: DeployRequest, verify: (req: DeployRequest) => boolean = () => true): SubmitResult {
    // Clobber guard: a changed file last shipped at a version AFTER this request's
    // base has moved since the artifact was built. Shipping would overwrite it.
    const conflicts = req.changes.filter((f) => (this.fileVersion.get(f) ?? 0) > req.base);
    if (conflicts.length > 0) {
      return {
        ok: false,
        reason: "stale base: these files changed since the artifact was built; rebuild from current",
        conflicts,
        current: this.version,
      };
    }
    if (!verify(req)) {
      return { ok: false, reason: "verification failed; not shipping", conflicts: [], current: this.version };
    }
    // Integrate onto current.
    this.version += 1;
    for (const f of req.changes) this.fileVersion.set(f, this.version);
    this.log.push({ version: this.version, agent: req.agent, intent: req.intent, files: req.changes, at: this.clock++ });
    return { ok: true, version: this.version };
  }

  history(): readonly ShipRecord[] {
    return this.log;
  }
}

/**
 * The capability gate. There is no function anywhere else that writes the live
 * state; an agent that tries to "just deploy" cannot, by construction.
 */
function attemptDirectShip(): never {
  throw new Error("refused: only the DeployAuthority holds the ship capability. File a request.");
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

function demo(): void {
  const authority = new DeployAuthority();
  console.log(`Live version: ${authority.current()}\n`);

  // Agent A built from v1, ships a clean change.
  console.log("1. Agent A files a request (base v1, changes a.ts + b.ts):");
  const a = authority.submit({ agent: "agent-A", intent: "tune ranking", base: 1, changes: ["a.ts", "b.ts"] });
  console.log("  ", a, `-> live is now v${authority.current()}`);

  // Agent B built from v1 too, BEFORE A shipped. Its change overlaps b.ts.
  console.log("\n2. Agent B files a request built from the SAME old base v1 (changes b.ts + c.ts):");
  const b1 = authority.submit({ agent: "agent-B", intent: "add caching", base: 1, changes: ["b.ts", "c.ts"] });
  console.log("  ", b1);
  console.log("   -> REFUSED. b.ts moved since v1 (A shipped it). No silent clobber.");

  // Agent B rebuilds from current (v2) and re-files. Now it integrates cleanly.
  console.log(`\n3. Agent B rebuilds from current (v${authority.current()}) and re-files:`);
  const b2 = authority.submit({ agent: "agent-B", intent: "add caching", base: authority.current(), changes: ["b.ts", "c.ts"] });
  console.log("  ", b2, `-> live is now v${authority.current()}`);

  // Someone tries to bypass the authority and ship directly.
  console.log("\n4. A direct-ship bypass attempt:");
  try {
    attemptDirectShip();
  } catch (e) {
    console.log("  ", e instanceof Error ? e.message : String(e));
  }

  console.log("\n5. The ship log (one record per real deploy, in order):");
  for (const r of authority.history()) {
    console.log(`   v${r.version}  ${r.agent}  "${r.intent}"  [${r.files.join(", ")}]`);
  }

  console.log(
    "\nTwo agents shipped overlapping work and nothing was clobbered: the stale request was " +
      "refused, rebuilt onto current, and only then integrated. One capability, one auditable place."
  );
}

demo();

export { DeployAuthority };
export type { DeployRequest, ShipRecord, SubmitResult };
