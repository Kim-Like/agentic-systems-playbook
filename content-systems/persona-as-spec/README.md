# Persona-as-spec (the spec is the product)

> The most valuable file in my agent is not code. It is the spec the prompt re-reads on every
> call: who the agent is, how it writes, what it stands for, what it refuses. Edit the spec,
> change the behavior, ship nothing. Treat that file as the product, because it is.

When an agent writes or acts in a particular voice and within particular values, the thing that
actually defines its output is not the model and not the surrounding code. It is the
specification you hand the model. This pattern is about treating that specification as a
first-class, editable product artifact rather than a string buried in a code constant.

## The problem

The default home for "how the agent should behave" is a prompt literal in the codebase. That has
three costs. First, **changing behavior requires a deploy**: every voice tweak, every new rule,
every refinement is a code change, a review, a release, so the people who actually understand the
voice (often not engineers) cannot touch it. Second, **the behavior is scattered**: a bit in the
system prompt, a bit in a helper, a bit in an example, so there is no single answer to "what is
this agent supposed to be". Third, **it ossifies**: because editing it is friction, it stops
improving, and the agent's voice drifts from what you actually want because fixing it is a
ticket.

## The pattern

Make the behavior specification a standalone artifact that the prompt loads fresh on every call.

**1. One spec file is the source of behavior.** Voice, values, the positions it argues from, the
content rules, the refusals: all of it in one human-readable specification, separate from code.
This is the single answer to "what is this agent". You can read it, diff it, and reason about
the agent's character without reading the implementation.

**2. The prompt re-reads it every call.** The agent loads the spec at request time, not baked in
at build time. So editing the spec changes the next response, with no deploy, no restart, no
release. The loop reads the current spec the way it reads any other live input.

**3. The spec is the product surface non-engineers own.** Because changing it is a file edit and
not a code change, the person who owns the voice can refine it directly. The spec becomes the
place product and editorial work happens, while the code stays stable underneath. You are
separating *what the agent is* (the spec, changes often, owned by whoever owns the voice) from
*how it runs* (the code, changes rarely, owned by engineering).

## Read-fresh, but still under control

"Re-read every call" does not mean "anyone edits it live with no guardrails". The spec is still a
reviewed artifact: it lives in version control, changes are diffed and approved, and it has an
owner. What you have removed is the *deploy* step between an approved spec change and it taking
effect, not the *review* step. And critically, the spec is read-only to the agent itself: the
agent reads its spec, it never writes it. (That is the [soul/memory split](../../memory-knowledge/soul-memory-split):
the spec is the immutable, human-authored half.)

## Why "re-read every call" and not "load once at boot"

Loading once at startup re-introduces the deploy friction through the back door: a spec change
needs a restart to take effect, and a restart is a deploy-shaped event. Re-reading per call (or
per cron tick) makes the spec genuinely live: change it, and the very next action reflects it.
The cost is a file read per call, which is nothing next to the model call it precedes. For the
price of one cheap read you buy "tune the agent without shipping", which is the entire point.

## What belongs in the spec, and what does not

- **In the spec:** identity, voice, values, the stances it argues from, content rules and
  refusals, the shape of its output, examples. The things a person tuning the agent's character
  would want to change.
- **Not in the spec:** secrets, tool wiring, control flow, the deterministic guardrails
  themselves (the spec *states* the rule so the model usually follows it; the
  [content gate](../deterministic-content-guardrails) *enforces* it in code). The spec is what
  the model should do; it is not the backstop that guarantees it.

## When NOT to use this

- **Agents with no persona** (a pure tool-runner, a classifier). There is no voice or values to
  specify; a prompt literal is fine.
- **A throwaway or single-shot prompt** you will never tune. The pattern pays off when the
  behavior is refined repeatedly over time by someone who is not redeploying.
- **Do not split the spec into a dozen governed fragments.** One coherent, human-authored
  specification is the unit. Over-fragmenting it recreates the "scattered behavior" problem you
  were solving.

## Related

The immutable half of the [soul/memory split](../../memory-knowledge/soul-memory-split), and the
thing the [deterministic content guardrails](../deterministic-content-guardrails) back up: the
spec tells the model the rule so it usually complies; the gate enforces the rule so it always
does. Change one, change both.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
