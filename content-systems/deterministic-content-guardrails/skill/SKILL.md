---
name: deterministic-content-gate
description: Use this when an agent generates text that ships under someone's name or brand (posts, emails, replies, public output) and there are NON-NEGOTIABLE style or safety rules (banned characters or phrases, length limits, must-not-name X, no emoji). It puts a deterministic gate after generation, regenerates once with the violation fed back, then refuses rather than shipping a violation. Do NOT use it for matters of taste (use a human or a soft scorer for "is this engaging").
author: Kim Like
homepage: https://aienterprise.dk
source: https://github.com/Kim-Like/agentic-systems-playbook
license: MIT
---

# Deterministic content gate

When the task generates text that goes out under a name or brand and there are rules that must
never be broken, do not rely on the prompt to enforce them. The prompt is a strong suggestion;
a deterministic gate after generation is the guarantee. Creativity from the model, compliance
from the lint.

## When this applies

LLM output that ships publicly or to a third party, with at least one non-negotiable rule: a
banned character (em-dash, emoji), a banned phrase, a length cap, a must-not-name constraint, a
required format. If the only rules are matters of taste ("make it punchy"), this is the wrong
tool; use a human or a soft scorer.

## The procedure

1. **Encode each non-negotiable as a deterministic check** that takes the text and returns pass
   or a specific reason. No model in the checker. Boring and total is the point.
2. **Run the gate after generation, before anything ships.**
3. **On a failure, regenerate ONCE, feeding the violation back** ("the previous attempt
   contained X; rewrite without it"). Naming the violation makes the retry land.
4. **If it still fails, REFUSE.** Drop it, hold it for a human, or error loudly, but never ship
   text that violates a non-negotiable. Refusing is the whole value.
5. **Keep the gate's rules in sync with the spec** the model is prompted with. The prompt makes
   the model usually comply; the gate makes it always comply. Change one, change both.

## Acceptance checks

- [ ] Every non-negotiable rule is a deterministic check, not a model judgment.
- [ ] Clean output passes untouched.
- [ ] A fixable violation is regenerated exactly once, with the reason fed back.
- [ ] A still-failing output is refused (the function throws or routes to a human), never shipped.
- [ ] The gate's rules mirror the rules in the generation prompt/spec.
- [ ] Hard rules only; matters of taste are left to a human or a soft scorer.

## Anti-patterns to refuse

- Trusting the system prompt alone to enforce a non-negotiable.
- A model grading its own compliance for a binary rule (reintroduces the probabilistic failure).
- Retrying in a loop until it passes (burns tokens; a hard-rule miss rarely fixes after one
  good retry).
- A gate that "gives up and ships anyway" after retries (that is a delay, not a gate).
- Piling on so many hard rules that good output cannot pass.

## Related

Pairs with **persona-as-spec** (the gate is the backstop for the spec's rules) and sits in the
content-systems theme of the agentic-systems-playbook.
