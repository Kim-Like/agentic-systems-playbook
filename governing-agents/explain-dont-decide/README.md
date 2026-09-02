# Let the model explain, let code decide

> When an agent operates over real money or a regulated filing, the language model should
> be able to read everything and explain anything, and be structurally unable to render the
> verdict. The verdicts belong to deterministic code.

This is the boundary pattern for high-stakes domains: finance, tax, compliance, anything
where being talked out of a rule is the failure mode you most fear. It is the same idea as
review-gated autonomy, pushed one level deeper: not just "a human approves outward actions,"
but "the model never owns a decision that a rule should own."

## The problem

Put a capable model in front of real financial data and the temptation is to let it judge:
"is this allowed?", "does this balance?", "is this loan legal?". It will answer fluently. It
will also, eventually, answer wrong, or be argued into a different answer by a user who phrases
the question three different ways. On a quarterly report or a tax return, a fluent wrong answer
that someone acted on is not a glitch, it is a liability.

You do not want a system that can be *persuaded*. You want one that can *explain* a result it
cannot change.

## The pattern

Split the work along a hard line: **the model explains, deterministic code decides.**

```
            ┌─────────────────────────── deterministic core ───────────────────────────┐
  raw data ─┤  load records → recompute the things the source won't give you →          │
            │  run a fixed set of named checks → each emits PASS / FAIL + a reason       │
            └───────────────────────────────────┬───────────────────────────────────────┘
                                                 │ verdicts (data, not prose)
                                                 ▼
   user ⇄ [ model ]  reads the data + the verdicts, explains them in plain language,
                     answers questions, drafts narrative. Cannot change a verdict.
```

**1. Recompute, don't trust the convenient number.** Source systems expose what is easy, not
what you need. If the figure you must check (a balance, a total, a reconciliation) is not a
first-class endpoint, pull the primitives (every ledger posting, every line item) and compute
it yourself. Tens of thousands of rows is nothing; a wrong trusted total is everything.

**2. A fixed set of named checks.** Every judgment is a function with a stable identifier
(`CHK_BALANCE_RECONCILES`, `CHK_OWNER_LOAN`, ...). Each returns a structured result: a status,
the figures it used, and a human-readable reason that cites the rule. There is no "the model
decided it was fine." The check decided, and you can point at the line of code and the statute
it encodes.

**3. The model is given the verdicts, not the authority.** It receives the data and the check
results as input. Its job is to explain each result in the user's language, answer follow-ups,
and draft the narrative around the filing. Its tools and prompts give it no path to flip a
FAIL to a PASS. A blocker stays blocked no matter how the question is rephrased.

**4. Explanation is unbounded; decision is not.** Let the model be generous on the explain
side: translate jargon, walk a nervous owner through what a failed check means, suggest what to
fix. None of that touches the verdict. This is what makes the system *feel* like an assistant
while behaving like a control.

## Why the split, specifically

- **Determinism where it counts.** The same inputs always produce the same verdicts, audit
  after audit. You can test the checks like any other code.
- **It cannot be socially engineered.** "But surely in this case..." has nowhere to land. The
  rule is in code, not in a context window.
- **Clear accountability.** When a verdict is questioned, you show the check and the rule it
  encodes, not a chat transcript.
- **The model still earns its keep.** Plain-language explanation over real numbers is genuinely
  valuable, and it is exactly the part models are good at and safe at.

## A test worth writing

Assert that the model-facing surface has **no capability** to mutate a verdict: no tool, no
endpoint, no field it can write that the check engine later reads. The guarantee should be
structural, providable by inspection, not "the prompt says not to."

## When NOT to use this

- **Low-stakes or reversible domains.** If a wrong answer costs nothing and is easily undone,
  the ceremony is overhead. Let the model answer directly.
- **There is no rule to encode.** This pattern needs a *decidable* question (a balance, a
  threshold, a legal condition). For genuinely subjective judgment, a deterministic check is
  false precision, be honest that a human decides.
- **You can't specify the checks.** If you cannot write the verdict as code, you do not yet
  understand the rule well enough to automate it. That is a domain problem, not a model problem.

## The transferable idea

Decide, up front and explicitly, what your model is *allowed to decide*. In a domain where
being wrong is expensive, the right answer is often: nothing that counts. Let it explain
everything and decide nothing, and put the decisions in code you can test, point at, and trust.
