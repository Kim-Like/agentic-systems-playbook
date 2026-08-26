# Build vs buy for agentic infrastructure

> Build vs buy for AI infrastructure is not ideology and it is not a vibe. It is a
> cost-control-failure-mode table you fill in per component. Owning the stack is a leverage
> argument made with numbers, not nostalgia; renting it is a focus argument made with the same
> numbers. Decide each piece on its own merits, not by a blanket rule.

When you build an agent system, you constantly choose between running a piece yourself and
renting it from a provider: the models, the queue, the vector store, the data plane, the
orchestration. The loud advice is tribal ("self-host everything", "never run your own infra").
Both are wrong as defaults. This is the framework I actually use to decide, component by
component.

## The trap on both sides

**Buy-everything** feels safe and fast, and it is, until the bill scales with your usage in a way
your margins do not, until the provider changes terms or sunsets the thing you depend on, until
your core differentiator is a feature you rent and cannot tune. You moved fast and woke up
without leverage on the part that matters most.

**Build-everything** feels principled and cheap, and it is, until you are maintaining a queue, a
model server, a vector store, and a deploy system instead of building your actual product. You
own everything, including all the failure modes, and your team's time, the scarcest resource,
goes to plumbing nobody pays you for.

Neither tribe is right because the answer is not global. It is per component.

## The three questions, per component

For each piece of infrastructure, answer three things and the decision usually falls out.

**1. Cost: how does the bill scale, and against what?** A rented component that costs per call or
per token scales with usage; a self-hosted one costs roughly fixed (a box, some ops time). Plot
them. Below some volume, rent is cheaper and the crossover may be far away; above it, owning wins
and the gap widens. The mistake is assuming today's volume forever. Ask where you will be, and
where the crossover is. If you are nowhere near it, rent and revisit; if you are past it on a
high-volume core component, owning is leverage you are leaving on the table.

**2. Control: is this a differentiator or a commodity?** If a component is part of what makes your
product *yours* (the thing you tune, the thing that has to behave exactly so), owning it buys you
the ability to change it. If it is a commodity (it just has to work, you will never customize
it), renting it is buying focus. Do not own commodities for pride, and do not rent your
differentiator for convenience. The question is not "can I build this" but "do I need to control
this".

**3. Failure modes: which set of risks do you prefer?** Every choice buys a different failure
surface. Rent and you take on provider risk: outages you cannot fix, rate limits, price changes,
deprecation, your data on someone else's machine. Own and you take on operational risk: you are
on call for it, you patch it, a bad night is yours to fix. Neither is safer in the abstract. Ask
which failures you are equipped to handle and which would actually hurt. A team with no ops
capacity should think hard before owning; a business whose whole value is uptime on one component
should think hard before renting it.

## A useful default, and the exceptions

A reasonable default: **rent commodities and anything below its cost crossover; own your
differentiator and anything you are clearly past the crossover on.** Then the interesting work is
the exceptions:

- **Own earlier than the math says** when the component is your differentiator and you will want
  to tune it, even if rent is cheaper today. You are buying control, and control compounds.
- **Rent longer than the math says** when you lack the ops capacity to own it well. A
  self-hosted component you cannot operate reliably is more expensive than the bill it saved,
  paid in incidents.
- **Own the data plane sooner than most things.** Your data and the path it travels is where lock-in
  and privacy risk concentrate. Even when you rent compute and models, think hard before handing
  the data plane itself to a provider you cannot leave.
- **Things to be slow to self-host:** anything with a real security or compliance burden you are
  not equipped to carry, and anything moving so fast that this year's self-hosted version is
  obsolete by the time you have it running.

## The honest part

Say the number. "We self-host the model because at our volume the API would cost N times our
infra and we need to tune it" is a real argument. "We self-host because real engineers run their
own infra" is not; it is a bill your investors pay for your pride. Equally, "we rent because at
our volume it is a fraction of one engineer's time and we would rather build the product" is
real; "we rent because running infra is scary" is a decision you should at least make on purpose.
Fill in the table, and let the numbers and the failure modes you can live with decide.

## When this framework does not apply

- **Pre-product-market-fit.** Before you know what you are building, rent almost everything and
  keep your time on finding the product. Optimizing infra economics for a product that might
  pivot is premature. Own later, deliberately, once the shape is real.
- **A genuine constraint that removes the choice** (a contractual data-residency requirement, a
  hard budget ceiling, a platform you cannot leave). Then the decision is made for you; this
  framework just tells you what it is costing you, which is still worth knowing.

## Related

The owned-infrastructure half of this is what makes [snapshot-based fleet deploys](../snapshot-fleet-deploys)
worth building: once you own the deploy path, you control how safely it ships.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
