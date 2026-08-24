# Model-tier routing

> Using your best model for everything is the most common avoidable AI cost. Route by task
> class: trivial mechanical work to a small model, bulk drafting to a mid tier, genuine judgment
> to the frontier. A short routing table beats "always use the best", on both cost and, often,
> latency, with no loss of quality where it matters.

When an agent system makes many model calls, the lazy default is to point them all at the most
capable model. It is simple and it works, and it quietly wastes most of your spend, because most
calls do not need the frontier. This pattern is the small amount of structure that fixes that.

## The problem

Tasks are not equal, but a single-model setup treats them as if they were. Reformatting a list,
extracting a field, classifying a short string: a small model does these perfectly and costs a
fraction. Drafting routine copy, summarizing, routine transforms: a mid tier handles them well.
Real reasoning, nuanced judgment, the hard synthesis: that is what the frontier is for. Send all
three classes to the frontier and you pay frontier prices for work a cheap model would ace, and
you often wait longer too. The waste scales with your call volume, silently.

## The pattern

Classify the task, then route to the cheapest tier that is sufficient.

**1. Define a few tiers by capability.** Three is usually enough: a small/fast tier, a mid tier,
and a frontier tier. Define them by what they are good enough for, not by vendor SKU, so the
table survives model releases (you swap which model fills a tier without changing the routing).

**2. Classify the task into a class, cheaply.** Decide what kind of work each call is: mechanical,
routine-generative, or judgment. The classification itself must be cheap, a heuristic, a label
the caller already knows, or at most a tiny model. If classifying costs as much as the work, you
have lost the savings. Often the caller knows the class for free (this code path is always
"extract a field"; that one is always "write the post").

**3. Route to the cheapest sufficient tier, with escalation.** Send the task to the lowest tier
that can do it well. Keep an escape hatch: if a cheap tier's output fails a quick quality check
(it could not parse, it refused, it is obviously wrong), escalate to the next tier and retry.
Most tasks never escalate; the ones that do still cost less on average than sending everything to
the top.

## Why route by task CLASS, not by trying and downgrading

You could send everything to the frontier and "downgrade later if it is fine". That never
happens; the default sticks. Routing by class up front is what actually changes the cost curve,
because the decision is made before the expensive call, not after. The class is a property of the
task you usually already know, so the routing is nearly free, and it is auditable: you can see
which classes cost what and tune the table.

## Pair it with a quality floor

Cheaper is only correct if quality holds. Put a light check after a cheap-tier call (does it
parse, does it satisfy the hard rules, is it in range) and escalate on failure. This is the same
shape as [deterministic content guardrails](../../content-systems/deterministic-content-guardrails):
the gate decides "good enough"; routing decides "which tier to try first". Together you get the
cheap tier's price on the many easy tasks and the frontier's quality on the few hard ones,
without choosing one globally.

## Do not over-tier

- Three tiers is plenty for almost everyone. A dozen finely-graded tiers is a maintenance burden
  that saves little over three.
- Do not route on cost alone. A task that is rare but high-stakes (a customer-facing decision)
  can go straight to the frontier even if a cheaper tier might manage; the savings on a rare call
  are not worth the risk. Route on "cheapest *sufficient*", where sufficiency includes the stakes.

## When NOT to use this

- **Low call volume.** If you make a handful of calls, the savings are noise and the routing is
  overhead. This pays off with volume.
- **One genuinely homogeneous workload** where every call really is the same hard class. Then
  there is nothing to route; pick the right single tier and move on.
- **When classification is unreliable and the cost of a wrong route is high.** If you cannot
  cheaply tell the classes apart and a misroute is expensive, send the ambiguous ones up. A bad
  router is worse than no router.

## In this folder

- [`skill/`](./skill): an installable skill for adding a model-tier router to an agent that makes
  many model calls: define tiers by capability, classify the task cheaply, route to the cheapest
  sufficient tier, and escalate on a failed quality check.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
