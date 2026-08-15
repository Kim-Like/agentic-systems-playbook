# Operator-in-the-loop review

> Autonomy people trust has a review surface. [Review-gated autonomy](../../governing-agents/review-gated-autonomy)
> guarantees nothing ships without a human act; this is the interface that makes that human act a
> five-second decision instead of a chore. If approving the agent's work is painful, the human
> stops reviewing carefully, and your gate becomes a rubber stamp.

The boundary is only as good as the review. A perfect gate with a miserable review screen gets
clicked through blindly, which is the same as no gate. This pattern is the UI discipline that
keeps the human genuinely in the loop: a surface where reviewing is fast, honest, and obviously
worth the few seconds it takes.

## The problem

When an agent produces work for a human to approve, the naive review screen is a wall: a list of
items, raw, with an approve button. Reviewing it well is tedious, so the reviewer does one of two
things, both bad. They rubber-stamp (approve without really reading, because reading is work),
which defeats the gate. Or they avoid it (the queue piles up because reviewing is unpleasant),
which defeats the autonomy. Either way the human is not meaningfully in the loop; they are a
bottleneck or a rubber stamp. The fix is not "tell them to review more carefully". It is to make
careful review cheap.

## The pattern

A review surface built so the right decision is the easy one.

**1. One card per item, with everything the decision needs and nothing else.** Each item to
review is a self-contained card: what the agent produced, what it is for, and the few pieces of
context a human needs to judge it. Not a raw row, not a link to go dig elsewhere. The reviewer
should be able to decide from the card alone. If they have to leave the card to understand it,
the card is incomplete.

**2. The real actions, in a clear hierarchy.** Approve, request changes, archive: the actual
decisions, as distinct affordances, with approve as the clear primary and the destructive option
visually quieter. Not five equal buttons; a hierarchy that matches how often each is the right
call. The reviewer's most common decision should be the most obvious one.

**3. Edit in place.** Often the right move is not "approve" or "reject" but "approve with a small
fix". Let the reviewer edit the agent's output directly in the card and approve the edited
version. This captures the most valuable human input (the correction) without a round-trip back
to the agent, and it records what the human actually changed.

**4. A manual-publish attestation that records without performing.** When the human posts
something by hand (the channel does not auto-send, or they chose to do it themselves), the
surface lets them record "I posted this" with a short note. It does not perform the action; it
attests to it. This keeps the audit trail complete even for the manual path. (This is the UI half
of the manual-publish path in review-gated autonomy.)

## Honesty rules for the surface

The review screen must never lie, because the reviewer trusts it to decide:

- **Honest empty states.** When there is nothing to review, say so plainly. Never fabricate a
  placeholder row to make the screen look busy; a fake item in a review queue is the worst
  possible fake.
- **Show real state, including failure.** If a dispatched item failed, the surface shows it
  failed, with the reason. Hiding failures from the review surface hides exactly what the human
  needs to act on.
- **No fabricated metrics.** If an engagement number is not really known, the surface says
  "not connected" or "no data", never an invented figure. A review surface that shows made-up
  numbers trains the reviewer to distrust all of it.

## Why this belongs with the autonomy patterns, not as a nice-to-have

It is tempting to treat the review UI as polish, built last, if there is time. That is backwards.
The review surface is where the human authority in [review-gated autonomy](../../governing-agents/review-gated-autonomy)
actually lives. A strong gate with a weak review screen is a gate nobody really operates. The
quality of the review interface directly sets how much you can trust the "human approved this"
guarantee. Build it as part of the boundary, not after it.

## When NOT to use this

- **Fully autonomous, ungated paths** where there is no human approval step by design (a
  low-stakes, high-volume action you decided not to gate). There is no review to make humane.
- **A single operator reviewing a trickle**, where a plain list genuinely suffices. Invest in the
  surface when review volume or stakes make rubber-stamping a real risk.
- **Do not let the surface become a second product** that outweighs the work it reviews. It
  should make the decision fast; it does not need to be a dashboard.

## Related

The interface layer of [review-gated autonomy](../../governing-agents/review-gated-autonomy) (the
human act it guarantees happens here), and where [auditable-or-it-doesn't-ship](../../reliability/auditable-or-it-doesnt-ship)
surfaces to a person: the review screen is the human-facing window onto the same honest state.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
