# Deterministic content guardrails

> Asking the model nicely works most of the time. For the rest, put a deterministic gate after
> generation: check the output against hard rules, regenerate once if it fails, then refuse to
> ship. Creativity comes from the model. Compliance comes from the lint.

When an agent writes things that go out under your name (posts, emails, replies, anything
public), you have style and safety rules that are not negotiable. "No em-dashes." "Never name a
client." "Under 280 characters." "No emoji." The mistake is trusting the prompt to enforce them.
The prompt is a strong suggestion; a gate is a guarantee.

## The problem

Put a rule in the system prompt and the model follows it, usually. Ninety-five percent
compliance sounds fine until you remember the output is going out unattended, at volume, under
your name. Five percent of public posts violating a rule you promised yourself you would never
break is not a rounding error; it is the one screenshot that defines you. And the failures are
not random noise you can ignore: they cluster exactly on the edge cases (a long input, an
unusual topic) where the model is already working hardest and is most likely to drop a rule.

You cannot prompt your way to a guarantee. The model is probabilistic by nature. A guarantee has
to come from something that is not.

## The pattern

A deterministic gate the generated text must pass before it can ship.

**1. Encode the rules as deterministic checks.** Each non-negotiable becomes a function that
takes the text and returns pass or a specific reason: a banned-character/regex check
(em-dashes, emoji), a banned-phrase check, a length bound, a required-absence check. Plain,
boring, total. No model involved in the checking; that is the point.

**2. One regeneration retry with the reason fed back.** If the output fails, regenerate once,
and tell the model exactly what it violated ("the previous attempt contained an em-dash; rewrite
without it"). Naming the violation makes the retry land far more often than a blind re-roll. One
retry, not a loop: if the model cannot satisfy a hard rule in two tries, more tries rarely help
and you are burning tokens.

**3. Then refuse. Do not ship a violation.** If the second attempt still fails, the content does
not go out. It is dropped, or held for a human, or it errors loudly, but it is never published in
violation of a rule you said was non-negotiable. "Refuse" is the whole value. A gate that
eventually gives up and ships the bad output is not a gate; it is a delay.

## Why a hard gate and not a softer score

You could have the model grade its own output, or score "how compliant is this 0 to 1". For
*non-negotiable* rules, do not. A non-negotiable is binary: the em-dash is there or it is not,
the client is named or not. A deterministic check answers that exactly and the same way every
time; a model-graded score introduces the same probabilistic failure you were trying to
eliminate, now in the judge. Use scoring for matters of taste ("is this on-brand?"); use a hard
deterministic gate for matters of rule.

## Keep the gate and the spec in sync

The rules in the gate should mirror the rules in the [persona spec](../) the model is prompted
with. The prompt tells the model the rule so it usually complies; the gate enforces the rule so
it always does. If you change one, change both. The gate is the backstop for the spec, not a
separate, drifting rulebook.

## When NOT to use this

- **Matters of taste, not rule.** Do not build a hard gate for "is this engaging". That is a
  judgment call for a human or a soft scorer, and a binary gate will reject good work.
- **Throwaway internal text** nobody sees. The gate is for output that ships under your name.
- **Do not pile on rules until nothing passes.** Every hard rule has a cost in regeneration and
  refusals. Gate the genuine non-negotiables; leave the rest to the prompt and to review.

## In this folder

- [`reference/`](./reference): a runnable `ContentGate` (configurable banned patterns, banned
  phrases, length bound, required-absence), and `generateWithGate()` that runs a generator,
  checks the output, regenerates once with the violation fed back, and **refuses** (throws) if
  it still fails. The `demo()` shows a clean pass, a violation fixed on the one retry, and a
  stubborn violation correctly refused rather than shipped.
- [`skill/`](./skill): an installable skill for putting any LLM-output path behind a
  deterministic gate with one-retry-then-refuse.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
