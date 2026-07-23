# Reference: content gate

A runnable `ContentGate` and `generateWithGate()` for
[deterministic content guardrails](../README.md): hard rules, one regeneration retry with the
violation fed back, then refuse.

## Run it

```bash
npx tsx content-gate.ts
```

## What the demo shows

With a gate of "no em-dash, no emoji, <= 280 chars, no 'game-changer'":

1. Clean output passes on the first attempt.
2. An output with an em-dash fails, the model is told exactly what to fix, and the single retry
   lands clean (`attempts=2`).
3. A stubborn output that keeps violating is **refused** (the function throws `GateRefusal`)
   rather than shipped.

## What to copy

- Rules are **deterministic functions** returning a specific reason. No model in the checker.
- The retry **names the violation**, which makes it land far more often than a blind re-roll.
- **One** retry, then refuse. More retries rarely fix a hard-rule miss and just burn tokens.
- `generateWithGate` **throws rather than returning a violation**. Refusing is the whole value.
- Keep the gate's rules **in sync with the persona spec** the model is prompted with: the prompt
  makes the model usually comply, the gate makes it always comply.

## A note on the em-dashes in this file

The regex and the test strings deliberately contain em-dashes; you cannot demonstrate an
em-dash gate without feeding it one. They are fixtures and pattern definitions, not prose.

## What this is not

The rule set is illustrative (characters, a phrase, a length). Real gates add the rules that
matter for your surface and wire `generate` to your actual model call. The retry-once-then-refuse
control flow is the part to keep.
