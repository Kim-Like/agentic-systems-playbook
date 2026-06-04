/**
 * Review-gated autonomy, a minimal, self-contained reference implementation.
 *
 * Demonstrates the pattern, not a production system: an in-memory review queue,
 * a SINGLE enqueue chokepoint, and a gated dispatcher (global + per-surface
 * kill-switch + per-surface daily cap) with a manual-publish path.
 *
 * Written from scratch to be read in one sitting. No external dependencies.
 * Run it:  npx tsx review-gated-dispatch.ts
 *
 * The invariant this file is built to make obvious:
 *   The outbox has exactly ONE writer (enqueueForDispatch), reached from exactly
 *   ONE place (an approval). The dispatcher only READS the outbox. With every
 *   flag OFF the system reverts to manual-publish with zero data loss.
 */

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

type DraftState =
  | "queued"
  | "changes_requested"
  | "approved"
  | "published"
  | "archived";

type DispatchState = "pending" | "sending" | "sent" | "failed" | "cancelled";

interface Draft {
  id: string;
  /** The outside-world surface this draft is destined for (generic, e.g. "email"). */
  surface: string;
  body: string;
  state: DraftState;
  createdAt: number;
}

interface DispatchRecord {
  id: string;
  draftId: string;
  surface: string;
  state: DispatchState;
  attempts: number;
  externalRef?: string;
  error?: string;
  sentAt?: number;
}

/**
 * A surface adapter performs the actual side effect. It NEVER decides whether to
 * send (the dispatcher enforces the gates first). It just delivers and returns a
 * non-secret reference id, or throws.
 */
interface Surface {
  name: string;
  deliver(draft: Draft): Promise<{ externalRef: string }>;
}

interface SurfacePolicy {
  /** Per-surface kill-switch. Ships OFF. */
  enabled: boolean;
  /** Max successful sends per UTC day on this surface. */
  dailyCap: number;
}

interface Switchboard {
  /** Global master kill-switch. OFF disables every surface regardless of policy. */
  globalEnabled: boolean;
  surfaces: Record<string, SurfacePolicy>;
}

type AuditEvent =
  | { kind: "enqueued"; draftId: string; surface: string; at: number }
  | { kind: "sent"; draftId: string; surface: string; ref: string; at: number }
  | { kind: "failed"; draftId: string; surface: string; error: string; at: number }
  | { kind: "cancelled"; draftId: string; surface: string; reason: string; at: number }
  | { kind: "published_manually"; draftId: string; note: string; at: number };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

let idSeq = 0;
const nextId = (prefix: string) => `${prefix}_${++idSeq}`;

const utcDayStart = (now = Date.now()): number => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

// ---------------------------------------------------------------------------
// The system
// ---------------------------------------------------------------------------

class ReviewGatedSystem {
  private drafts = new Map<string, Draft>();
  private outbox = new Map<string, DispatchRecord>();
  readonly audit: AuditEvent[] = [];

  constructor(
    private readonly surfaces: Map<string, Surface>,
    private readonly switchboard: Switchboard
  ) {}

  /** The agent produces work. It lands in review, never in the outbox. */
  draft(surface: string, body: string): Draft {
    const d: Draft = {
      id: nextId("draft"),
      surface,
      body,
      state: "queued",
      createdAt: Date.now(),
    };
    this.drafts.set(d.id, d);
    return d;
  }

  /** Human decision. `approve` is the ONLY action that enqueues for dispatch. */
  transition(
    draftId: string,
    action: "approve" | "request_changes" | "archive"
  ): Draft {
    const d = this.mustDraft(draftId);
    const legal: Record<typeof action, DraftState[]> = {
      approve: ["queued", "changes_requested"],
      request_changes: ["queued", "approved"],
      archive: ["queued", "changes_requested", "approved"],
    };
    if (!legal[action].includes(d.state)) {
      throw new Error(`illegal transition: ${action} from ${d.state}`);
    }
    d.state =
      action === "approve"
        ? "approved"
        : action === "request_changes"
          ? "changes_requested"
          : "archived";

    // The recorded human act. The SOLE place that reaches the enqueue chokepoint.
    if (action === "approve") this.enqueueForDispatch(d.id);
    // Archiving an already-enqueued draft must pull it back out of the outbox,
    // or the dispatcher would still send it. Held-back work leaves no send.
    if (action === "archive") this.cancelOutbox(d.id, "archived after enqueue");
    return d;
  }

  /** Cancel any not-yet-sent outbox record for a draft (held back / manually done). */
  private cancelOutbox(draftId: string, reason: string): void {
    for (const r of this.outbox.values()) {
      if (r.draftId === draftId && (r.state === "pending" || r.state === "sending")) {
        r.state = "cancelled";
        r.error = reason;
        this.audit.push({ kind: "cancelled", draftId, surface: r.surface, reason, at: Date.now() });
      }
    }
  }

  /**
   * THE SINGLE ENQUEUE CHOKEPOINT. The only function in the system that writes a
   * record to the outbox. Idempotent: re-approving an already-queued draft does
   * not create a duplicate. A surface with no dispatch policy is never enqueued
   * (it can only be published manually), the analogue of a "manual-only" surface.
   */
  private enqueueForDispatch(draftId: string): DispatchRecord | null {
    const d = this.mustDraft(draftId);
    if (!this.switchboard.surfaces[d.surface]) return null; // manual-only surface

    for (const r of this.outbox.values()) {
      if (r.draftId === draftId && (r.state === "pending" || r.state === "sending")) {
        return r; // idempotent
      }
    }
    const rec: DispatchRecord = {
      id: nextId("disp"),
      draftId,
      surface: d.surface,
      state: "pending",
      attempts: 0,
    };
    this.outbox.set(rec.id, rec);
    this.audit.push({ kind: "enqueued", draftId, surface: d.surface, at: Date.now() });
    return rec;
  }

  /**
   * Record that a human published an approved draft by hand. This does NOT send
   * and does NOT touch the outbox; it is what makes "everything off" lossless.
   */
  markPublishedManually(draftId: string, note: string): Draft {
    const d = this.mustDraft(draftId);
    if (d.state !== "approved") {
      throw new Error(`can only manually publish an approved draft (is ${d.state})`);
    }
    if (!note.trim()) throw new Error("manual publish requires a note (the human record)");
    // The human did the last step. Pull the draft's record out of the outbox so
    // the dispatcher cannot also send it. (This is what prevents a double-send.)
    this.cancelOutbox(draftId, "published manually");
    d.state = "published";
    this.audit.push({ kind: "published_manually", draftId, note, at: Date.now() });
    return d;
  }

  /**
   * Drain the outbox, honoring every gate. The dispatcher only READS the outbox;
   * it never creates a record. Safe to call when everything is OFF (fast no-op).
   */
  async runCycle(): Promise<{ sent: number; skipped: number; failed: number }> {
    const result = { sent: 0, skipped: 0, failed: 0 };
    if (!this.switchboard.globalEnabled) {
      result.skipped = this.pending().length;
      return result; // global kill-switch: touch nothing
    }

    // Group pending work by surface so caps apply per surface.
    const bySurface = new Map<string, DispatchRecord[]>();
    for (const r of this.pending()) {
      (bySurface.get(r.surface) ?? bySurface.set(r.surface, []).get(r.surface)!).push(r);
    }

    for (const [surfaceName, records] of bySurface) {
      const policy = this.switchboard.surfaces[surfaceName];
      const adapter = this.surfaces.get(surfaceName);
      if (!policy?.enabled || !adapter) {
        result.skipped += records.length; // per-surface switch off / no adapter
        continue;
      }
      let budget = Math.max(0, policy.dailyCap - this.sentToday(surfaceName));
      for (const rec of records) {
        if (budget <= 0) {
          result.skipped++; // cap reached: record stays pending for tomorrow
          continue;
        }
        rec.state = "sending"; // claim (single-threaded here; a real system does this atomically)
        rec.attempts++;
        try {
          const { externalRef } = await adapter.deliver(this.mustDraft(rec.draftId));
          rec.state = "sent";
          rec.externalRef = externalRef;
          rec.sentAt = Date.now();
          this.mustDraft(rec.draftId).state = "published";
          this.audit.push({
            kind: "sent",
            draftId: rec.draftId,
            surface: surfaceName,
            ref: externalRef,
            at: rec.sentAt,
          });
          budget--;
          result.sent++;
        } catch (err) {
          rec.state = "failed";
          rec.error = err instanceof Error ? err.message : String(err);
          this.audit.push({
            kind: "failed",
            draftId: rec.draftId,
            surface: surfaceName,
            error: rec.error,
            at: Date.now(),
          });
          result.failed++;
        }
      }
    }
    return result;
  }

  // --- read-only views ---
  pending = () => [...this.outbox.values()].filter((r) => r.state === "pending");
  getDraft = (id: string) => this.drafts.get(id);
  private sentToday(surface: string): number {
    const start = utcDayStart();
    let n = 0;
    for (const r of this.outbox.values()) {
      if (r.surface === surface && r.state === "sent" && (r.sentAt ?? 0) >= start) n++;
    }
    return n;
  }
  private mustDraft(id: string): Draft {
    const d = this.drafts.get(id);
    if (!d) throw new Error(`no such draft: ${id}`);
    return d;
  }
}

// ---------------------------------------------------------------------------
// Demo, walks a draft from agent output to sent, and shows the off-state.
// ---------------------------------------------------------------------------

async function demo(): Promise<void> {
  // A generic surface adapter that just "delivers" to the console.
  const consoleSurface: Surface = {
    name: "broadcast",
    async deliver(draft) {
      console.log(`    [surface:broadcast] delivered: "${draft.body}"`);
      return { externalRef: nextId("ref") };
    },
  };

  const system = new ReviewGatedSystem(
    new Map([[consoleSurface.name, consoleSurface]]),
    {
      globalEnabled: false, // ships OFF
      surfaces: { broadcast: { enabled: false, dailyCap: 2 } }, // ships OFF, cap 2/day
    }
  );

  console.log("1. Agent drafts three items (autonomous up to here):");
  const a = system.draft("broadcast", "Pattern note: gate the chokepoint.");
  const b = system.draft("broadcast", "Pattern note: ship flags OFF.");
  const c = system.draft("broadcast", "Pattern note: caps defer, never drop.");

  console.log("2. Human reviews. Approve two, archive one:");
  system.transition(a.id, "approve");
  system.transition(b.id, "approve");
  system.transition(c.id, "archive");
  console.log(`   outbox pending: ${system.pending().length} (archived item never enqueued)`);

  console.log("3. Dispatcher runs while everything is OFF (the safe default):");
  console.log("  ", await system.runCycle(), "-> nothing sent, records wait");

  console.log("4. Operator publishes one BY HAND (off-state loses nothing):");
  system.markPublishedManually(a.id, "Posted manually at 09:14; two replies within the hour.");

  console.log("5. Operator flips the switches ON and the dispatcher sends the rest:");
  // In a real system these are env flags read at cycle time; here we just set them.
  (system as unknown as { switchboard: Switchboard }).switchboard.globalEnabled = true;
  (system as unknown as { switchboard: Switchboard }).switchboard.surfaces.broadcast.enabled = true;
  console.log("  ", await system.runCycle());

  console.log("6. Audit trail (one line per real event):");
  for (const e of system.audit) console.log("   -", JSON.stringify(e));

  console.log(
    "\nInvariant held: every send traces to an approval; the off-state was lossless; " +
      "the dispatcher created zero records."
  );
}

// Run the demo when executed directly.
demo().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

export { ReviewGatedSystem };
export type { Draft, DispatchRecord, Surface, Switchboard, SurfacePolicy, AuditEvent };
