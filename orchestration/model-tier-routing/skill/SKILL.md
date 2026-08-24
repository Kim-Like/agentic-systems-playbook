---
name: model-tier-routing
description: Use this when an agent or system makes MANY model calls of differing difficulty and is sending them all to one (usually the most capable, most expensive) model. It adds a router: define a few tiers by capability, classify each task cheaply, route to the cheapest sufficient tier, and escalate on a failed quality check. Do NOT use it for low call volume or a genuinely homogeneous workload.
author: Kim Like
homepage: https://aienterprise.dk
source: https://github.com/Kim-Like/agentic-systems-playbook
license: MIT
---

# Model-tier routing

When the system makes many model calls and they all go to the top-tier model, most of that spend
is wasted: most calls do not need the frontier. Add a small router that sends each task to the
cheapest model that can do it well.

## When this applies

Many model calls of differing difficulty (mechanical reformatting, routine drafting, real
judgment) currently all hitting one model. If call volume is low, or every call is genuinely the
same hard class, skip this; pick the right single tier instead.

## The procedure

1. **Define a few tiers by capability, not by vendor SKU.** Usually three: small/fast,
   mid, frontier. Describe each by what it is good enough for, so you can swap the underlying
   model without changing the routing.

2. **Classify each task into a class, cheaply.** Mechanical, routine-generative, or judgment.
   The classification must be cheap: a heuristic, a label the caller already knows, or at most a
   tiny model. If classifying costs as much as the work, the savings are gone. Prefer a class the
   caller knows for free (this path is always "extract a field"; that one is always "write copy").

3. **Route to the cheapest sufficient tier.** Send the task to the lowest tier that handles it
   well. "Sufficient" includes the stakes: a rare but high-stakes call can go straight to the
   frontier even if a cheaper tier might manage.

4. **Add a quality floor and escalate on failure.** After a cheap-tier call, run a light check
   (does it parse, does it satisfy the hard rules, is it in range). On failure, escalate to the
   next tier and retry. Most tasks never escalate.

5. **Make the table auditable and tune it.** Track which classes route where and what they cost,
   so you can move a class up or down with evidence.

## Acceptance checks

- [ ] There are a small number of tiers defined by capability, not pinned to a vendor SKU.
- [ ] Each call is classified cheaply (heuristic / known label / tiny model), not by an
      expensive pre-call.
- [ ] Tasks route to the cheapest sufficient tier, with stakes factored into "sufficient".
- [ ] A failed quality check on a cheap tier escalates to the next tier rather than shipping a
      bad result.
- [ ] Routing decisions and per-class cost are visible enough to tune.

## Anti-patterns to refuse

- Sending every call to the most capable model "to be safe", with a vague intent to optimize
  later (later never comes).
- A classifier that costs as much as the task it routes.
- Routing on cost alone, ignoring stakes, so a rare high-stakes call lands on a weak tier.
- A dozen finely-graded tiers that cost more to maintain than they save.
- No quality floor, so a cheap-tier miss ships instead of escalating.

## Related

Pairs with **knowledge-graph routing** (route the context) and
**deterministic content guardrails** (the quality floor that decides "good enough" and triggers
escalation). All in the agentic-systems-playbook.
