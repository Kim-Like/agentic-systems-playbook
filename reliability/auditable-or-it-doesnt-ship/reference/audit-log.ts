/**
 * Auditable or it doesn't ship, a runnable reference.
 *
 * An append-only audit log for agent ACTIONS (not reads): structured events,
 * written on success AND failure, that link an action back to the human/decision
 * that authorized it, and that NEVER store a credential (a redaction seatbelt
 * strips key-like strings from any field before it is written).
 *
 * From scratch, no dependencies. Run it:  npx tsx audit-log.ts
 */

type AuditKind = "enqueued" | "authorized" | "sent" | "failed" | "cancelled";

interface AuditEvent {
  id: string;
  kind: AuditKind;
  at: number; // epoch ms
  surface?: string; // the outside-world surface (generic, e.g. "email")
  entityId?: string; // the draft / job this is about
  ref?: string; // non-secret external reference the action produced (message id, post id)
  authorizedBy?: string; // who/what released it (links the action to its authorization)
  outcome?: string; // a short, non-secret human note
  error?: string; // failure detail (redacted)
}

// ---------------------------------------------------------------------------
// Redaction seatbelt
// ---------------------------------------------------------------------------

/**
 * Strip anything that looks like a secret before it is stored. This is defence
 * in depth, NOT a license to pass secrets in; the rule is still "do not put a
 * credential in an audit field". But the audit is one of the most-exported
 * surfaces in the system, so we scrub it anyway.
 */
function redact(value: string): string {
  return value
    .replace(/\b(ghp_|github_pat_|AKIA|sk-)[A-Za-z0-9_-]{6,}/g, "$1[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{10,}/gi, "Bearer [redacted]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, (m) => `${m.slice(0, 4)}[redacted]`);
}

function redactFields<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (typeof out[k] === "string") (out as Record<string, unknown>)[k] = redact(out[k] as string);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The audit log
// ---------------------------------------------------------------------------

class AuditLog {
  private events: AuditEvent[] = [];
  private seq = 0;

  /** Append one event. String fields are redacted on the way in. Append-only: no edit, no delete. */
  record(e: Omit<AuditEvent, "id">): AuditEvent {
    const event = redactFields({ ...e, id: `a_${++this.seq}` }) as AuditEvent;
    this.events.push(event);
    return event;
  }

  /** Answer "what happened" questions with a query, not a grep. */
  query(filter: { surface?: string; kind?: AuditKind; since?: number } = {}): AuditEvent[] {
    return this.events.filter(
      (e) =>
        (filter.surface === undefined || e.surface === filter.surface) &&
        (filter.kind === undefined || e.kind === filter.kind) &&
        (filter.since === undefined || e.at >= filter.since)
    );
  }

  all(): readonly AuditEvent[] {
    return this.events;
  }
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

function demo(): void {
  const audit = new AuditLog();
  const t0 = 1_700_000_000_000;

  // 1. A human authorized a draft. The action's trail starts here.
  audit.record({ kind: "authorized", at: t0, surface: "email", entityId: "draft_92", authorizedBy: "operator:dana" });

  // 2. It sent. Record the non-secret external reference, linked to the surface.
  audit.record({ kind: "sent", at: t0 + 4000, surface: "email", entityId: "draft_92", ref: "msg-id-7f3a", outcome: "delivered" });

  // 3. A different one FAILED. The failure row is the valuable one. Note the
  //    error text accidentally contains a token; the seatbelt scrubs it.
  audit.record({
    kind: "failed",
    at: t0 + 9000,
    surface: "email",
    entityId: "draft_93",
    error: "provider rejected request, auth header was Bearer sk-live-ABCDEF1234567890QRSTUV",
  });

  console.log("1. The audit trail (note: NOT a credential in sight):");
  for (const e of audit.all()) console.log("   -", JSON.stringify(e));

  console.log("\n2. Answer a question with a query: everything on surface 'email' today:");
  for (const e of audit.query({ surface: "email", since: t0 })) {
    console.log(`   ${e.kind.padEnd(10)} ${e.entityId}  ${e.ref ?? e.error ?? e.outcome ?? ""}`);
  }

  console.log("\n3. The authorization question (who released draft_92?):");
  const auth = audit.query({ surface: "email" }).find((e) => e.kind === "authorized" && e.entityId === "draft_92");
  const sent = audit.query({ kind: "sent" }).find((e) => e.entityId === "draft_92");
  console.log(`   draft_92 was authorized by ${auth?.authorizedBy} and sent as ${sent?.ref}.`);

  console.log(
    "\nEvery action is reconstructable, failures are first-class, and the token in the " +
      "failure string was redacted before it was ever stored."
  );
}

demo();

export { AuditLog, redact };
export type { AuditEvent, AuditKind };
