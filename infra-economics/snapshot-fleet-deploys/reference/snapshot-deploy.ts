/**
 * Snapshot-based fleet deploys, a runnable reference.
 *
 *   - build in an ISOLATED workspace cloned from current (no shared-dir bleed)
 *   - freeze an IMMUTABLE, content-addressed snapshot (the unit you deploy)
 *   - deploy ATOMICALLY (stage, then flip one pointer; a failed stage changes nothing)
 *   - a ROLLBACK GUARD refuses a snapshot built from a stale base unless allowRollback
 *   - PRUNE bounds the snapshot store (keep the last N, never drop the live one)
 *
 * From scratch, no dependencies. Run it:  npx tsx snapshot-deploy.ts
 */

type Files = Record<string, string>;

/** A tiny content hash, to show snapshots are content-addressed (not crypto). */
function hash(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) h = (h * 31 + content.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

interface Snapshot {
  id: string;
  gen: number; // monotonic, assigned at freeze; defines ordering
  base: number; // the live gen this was built from (basis for the rollback guard)
  manifest: Record<string, string>; // file -> content hash. Immutable once frozen.
  files: Files;
}

class Workspace {
  files: Files;
  constructor(public readonly base: number, seed: Files) {
    this.files = { ...seed }; // a private CLONE of current; edits here cannot leak out
  }
  edit(path: string, content: string): void {
    this.files[path] = content;
  }
}

class Fleet {
  private store = new Map<string, Snapshot>();
  private genCounter = 0;
  private snapCounter = 0;
  liveId: string;
  liveGen: number;

  constructor(initial: Files) {
    const genesis = this.freezeFrom(new Workspace(0, initial)); // gen 0 lives at start
    this.liveId = genesis.id;
    this.liveGen = genesis.gen;
  }

  /** Clone the current live state into a fresh isolated workspace. */
  checkout(): Workspace {
    return new Workspace(this.liveGen, this.store.get(this.liveId)!.files);
  }

  /** Freeze a workspace into an immutable, content-addressed snapshot. */
  freeze(ws: Workspace): Snapshot {
    return this.freezeFrom(ws);
  }
  private freezeFrom(ws: Workspace): Snapshot {
    const manifest: Record<string, string> = {};
    for (const [p, c] of Object.entries(ws.files)) manifest[p] = hash(c);
    const snap: Snapshot = {
      id: `snap_${++this.snapCounter}`,
      gen: this.genCounter++,
      base: ws.base,
      manifest,
      files: { ...ws.files },
    };
    Object.freeze(snap.manifest);
    Object.freeze(snap); // immutable
    this.store.set(snap.id, snap);
    return snap;
  }

  /**
   * Atomic deploy with a rollback guard. Stage (validate) fully, then flip the
   * live pointer in one step. A snapshot whose base is behind the live gen would
   * revert work shipped since: refused unless allowRollback.
   */
  deploy(id: string, opts: { allowRollback?: boolean } = {}): { ok: boolean; reason?: string } {
    const snap = this.store.get(id);
    if (!snap) return { ok: false, reason: "no such snapshot" };

    // Rollback / clobber guard.
    if (snap.base < this.liveGen && !opts.allowRollback) {
      return {
        ok: false,
        reason: `would roll the fleet back: built from gen ${snap.base}, live is gen ${this.liveGen}. Rebuild from current (or pass allowRollback).`,
      };
    }

    // Stage: validate the snapshot fully BEFORE touching the live pointer.
    const staged = this.stage(snap);
    if (!staged.ok) return { ok: false, reason: `stage failed (${staged.reason}); live pointer unchanged` };

    // Flip: one atomic pointer move. Before this line the fleet is fully on the
    // old snapshot; after it, fully on the new one. Never a partial mix.
    this.liveId = snap.id;
    this.liveGen = snap.gen;
    return { ok: true };
  }

  /** Validate a snapshot is complete and self-consistent (manifest matches files). */
  private stage(snap: Snapshot): { ok: boolean; reason?: string } {
    if (Object.keys(snap.files).length === 0) return { ok: false, reason: "empty artifact" };
    for (const [p, h] of Object.entries(snap.manifest)) {
      if (hash(snap.files[p] ?? "") !== h) return { ok: false, reason: `hash mismatch on ${p}` };
    }
    return { ok: true };
  }

  /** Bound the store: keep the newest `keep` snapshots, never dropping the live one. */
  prune(keep: number): number {
    const all = [...this.store.values()].sort((a, b) => b.gen - a.gen);
    let dropped = 0;
    for (const snap of all.slice(keep)) {
      if (snap.id === this.liveId) continue; // never prune what is live
      this.store.delete(snap.id);
      dropped++;
    }
    return dropped;
  }

  size(): number {
    return this.store.size;
  }
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

function demo(): void {
  const fleet = new Fleet({ "home.html": "v0 home", "about.html": "v0 about" });
  console.log(`Start: live is gen ${fleet.liveGen} (${fleet.liveId}).\n`);

  console.log("1. Agent A builds in an isolated workspace and ships:");
  const wsA = fleet.checkout();
  wsA.edit("home.html", "v1 home, improved hero");
  const sA = fleet.freeze(wsA);
  console.log("  ", fleet.deploy(sA.id), `-> live is gen ${fleet.liveGen}`);

  console.log("\n2. Agent B was already working from the OLD base when A shipped:");
  const wsB = fleet.checkout(); // base = current (gen 1)... so simulate B built from gen 0:
  // To model a stale build, B froze from a workspace based on gen 0 (before A).
  const staleWs = new Workspace(0, { "home.html": "v0 home", "about.html": "v1 about by B" });
  const sB = fleet.freeze(staleWs);
  console.log("  ", fleet.deploy(sB.id));
  console.log("   -> REFUSED by the rollback guard (no silent reversion of A's work).");
  void wsB;

  console.log("\n3. Agent B rebuilds from CURRENT and ships cleanly:");
  const wsB2 = fleet.checkout();
  wsB2.edit("about.html", "v2 about by B, onto current");
  const sB2 = fleet.freeze(wsB2);
  console.log("  ", fleet.deploy(sB2.id), `-> live is gen ${fleet.liveGen}`);

  console.log("\n4. Atomicity: a broken snapshot (empty artifact) fails to stage:");
  const broken = fleet.freeze(new Workspace(fleet.liveGen, {}));
  const liveBefore = fleet.liveId;
  console.log("  ", fleet.deploy(broken.id));
  console.log(`   -> live pointer unchanged (${fleet.liveId === liveBefore ? "still " + liveBefore : "CHANGED (bug)"}). No half-applied deploy.`);

  console.log(`\n5. Prune the store (keep 3). Snapshots before: ${fleet.size()}.`);
  const dropped = fleet.prune(3);
  console.log(`   dropped ${dropped}; snapshots now: ${fleet.size()} (the live one is never pruned).`);

  console.log(
    "\nImmutable snapshots made 'what shipped' exact, the atomic flip kept the fleet whole, the " +
      "rollback guard stopped a stale build from reverting newer work, and prune bounded the store."
  );
}

demo();

export { Fleet, Workspace };
export type { Snapshot, Files };
