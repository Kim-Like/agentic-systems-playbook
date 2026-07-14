# Auditable or it doesn't ship

> If an agent action left no trace, it did not happen safely. A trace is not compliance
> theater. It is how you debug at 3am, how you answer "who authorized this", and how you tell a
> near-miss from a disaster.

An autonomous system you cannot reconstruct after the fact is a liability with good PR. This
pattern is the cheap, boring discipline that makes every agent action investigable: a
non-secret audit row for what happened, written on success and on failure, that never leaks a
credential.

## The problem

When an agent does work on its own and something looks wrong later (a customer got an odd
email, a number is off, a post appeared you did not expect), the first question is always the
same: what actually happened, when, on what, and who allowed it. If the answer is "let me check
the logs" and the logs are unstructured console noise that rolled over yesterday, you are
guessing. Guessing about an autonomous system that affects the outside world is how a small
problem becomes an incident with no paper trail.

## The pattern

A dedicated, append-only audit record, separate from your debug logging, with four
properties.

**1. One row per real event, structured.** Every meaningful action writes a row: enqueued,
sent, failed, cancelled, approved, published-by-hand. Structured fields, not a sentence: what
kind of event, when, which surface, which entity (the draft/job id), the external reference the
action produced (a message id, a post id), and the outcome. Structured means you can answer
"everything we sent to surface X today" with a query, not a grep.

**2. Written on success AND on failure.** The failure rows are the valuable ones. A system that
only logs what worked tells you nothing when something does not. On a failure, record the
error text (sanitized, see below) so the row explains why, and the retry/abandon decision is
visible. "What did we try and fail to do" must be as answerable as "what did we do."

**3. Append-only and non-secret by construction.** The audit is a record of history; you do not
edit it. And it carries no credentials, ever: not a token, not a cookie, not a password, not a
session value. The audit is one of the most-read, most-exported surfaces in the system, so a
secret in it is a secret everywhere. Strip anything that looks like a key before it is written,
as a seatbelt on top of "do not put it there in the first place".

**4. It answers the authorization question.** For anything that affected the outside world, the
trail must connect the action back to the human (or the recorded decision) that authorized it.
"Sent" links to the approval that released it. This is what turns "the agent did something" into
"the agent did something a named person approved at a known time".

## Audit log vs debug log

They are different tools; do not conflate them. Debug logs are verbose, ephemeral, for
developers, and roll over. The audit is sparse, durable, queryable, for answering "what did this
system do to the world", and you keep it. Putting audit-grade events only in debug logs means
losing them exactly when you need them. Write the audit row deliberately, as part of the action,
not as a log line you hope survives.

## Why this earns its keep

- **Debugging an autonomous system** is reconstruction, and reconstruction needs a record. The
  audit turns "we think it sent around then" into a timeline.
- **Trust** with whoever you operate for (a client, a compliance function, yourself) comes from
  being able to show exactly what happened, on demand.
- **Catching a near-miss** depends on seeing the failure rows. A pattern of failures on one
  surface is an early warning you only get if you wrote the failures down.

## When NOT to use this

- **Do not audit reads.** Audit actions and decisions (things that changed the world or
  authorized a change), not every query. Auditing reads buries the signal.
- **Do not put PII or payload bodies in the audit by reflex.** Record the reference and the
  outcome; keep sensitive content in the system of record it belongs to, referenced by id. The
  audit says "sent draft 92 to surface X (ref abc)", not the full body, unless you have a
  specific, lawful reason to retain it.
- **Do not let the audit become the debug log.** If you are writing a row per loop iteration,
  you have built a noisy log, not an audit. Rows are for events that matter.

## In this folder

- [`reference/`](./reference): a runnable `AuditLog`, append-only, with structured events
  (enqueued / sent / failed / authorized), a `redact()` seatbelt that strips key-like strings
  from any field before it is stored, and a query API. The `demo()` records an approval, a
  send, and a failure, shows that a leaked token in an error string is redacted before storage,
  and answers "what happened on surface X today" with a query.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
