# Reference: audit log

A runnable, append-only `AuditLog` for the [auditable-or-it-doesn't-ship](../README.md) pattern:
structured events, written on success and failure, with a redaction seatbelt and a query API.

## Run it

```bash
npx tsx audit-log.ts
```

## What the demo shows

1. An action's trail: `authorized` (by a named operator), then `sent` (with a non-secret
   reference), then a `failed` event for a different item. No credentials anywhere.
2. Answering "what happened on surface `email` today" with a **query**, not a log grep.
3. Connecting a send back to the human who authorized it.

And the seatbelt: the `failed` event's error string contained a token (`Bearer sk-live-...`);
it was **redacted before storage**, so the audit is safe to export.

## What to copy

- Audit **actions and decisions**, not reads. One row per real event.
- Write the **failure** rows; they are the ones you will actually need.
- Store the **reference and outcome**, link to the **authorizer**; keep payload bodies and PII
  in the system of record, referenced by id.
- Run a **redaction pass** on every string field as defence in depth, even though the real rule
  is "do not put a secret in an audit field".
- Keep the audit **separate from debug logs**: sparse, durable, queryable, retained.

## What this is not

In-memory and append-only-by-convention. A production version persists to an immutable or
write-once store, indexes the query fields, and sets a retention policy. The event shape and
the redaction discipline are the parts to keep.
