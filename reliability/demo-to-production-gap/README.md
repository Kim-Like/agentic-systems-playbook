# The demo-to-production gap

> The demo ran clean ten times. Three weeks in, it silently produced a wrong answer that
> looked right, and nothing errored. Demo inputs are always yours. Production inputs are not.

Agents do not usually fail by crashing. They fail by **succeeding on the wrong thing**: they
accept an input shaped a little differently than the ones you tested, produce output that
looks plausible, and the system downstream accepts it. You find out days later, from a human
spot-check, not from an alert. This is the gap between "it works in the demo" and "it works."

## Why it happens

A demo is a closed world. You wrote the inputs, so they are all well-formed, in the range you
imagined, in the format you expect. The model handles them and you ship. Production opens the
world: a field arrives empty, a number arrives as a string, a date is in a different locale, a
list that was always short is suddenly long. The model does not throw on these. It does its
best, confidently, and "its best" on an input you never considered is a guess dressed as a
result.

Two things make this worse for agents specifically:

- **They are designed to always produce an answer.** A function with a bad argument can throw.
  An agent will reason its way to *something*, which removes the natural failure signal.
- **The output is plausible by construction.** A model that produces fluent, well-formed
  output will produce fluent, well-formed *wrong* output. Plausibility is not correctness, and
  it is exactly what defeats a casual eyeball.

## Two cheap guards that catch most of it

You do not need a research program. You need two boundaries the agent cannot talk its way past.

### 1. An input-boundary check (fail loud, before the agent runs)

Validate the shape, type, and range of every input **before** it reaches the agent, and
**reject** anything unexpected loudly instead of letting the agent improvise on it. This is
the boundary a demo never has, because a demo's inputs are all valid by construction.

The rule: an input the agent was not designed for should produce a *handled rejection* (queue
it for a human, route it elsewhere, error visibly), never a silent best-effort. You are
trading a small amount of "it refused something it maybe could have handled" for the
elimination of "it confidently mishandled something it should not have touched."

### 2. A deviation monitor (flag output that strays from the baseline)

Track one or two cheap signals about the agent's output over time (a length, a count, a
numeric result, a rate) as a rolling baseline. When a new output deviates from that baseline
by more than a threshold, flag it for review instead of letting it through silently. This
catches the failure mode where the *shape* is fine but the *value* has quietly drifted: the
field that got capped at an old default, the count that collapsed to zero, the number that is
an order of magnitude off.

A deviation flag is not a verdict. It is a prompt to look. Most flags will be fine. The point
is that the *one* that is not fine becomes visible the same day, not three weeks later.

## Why these two and not more

They sit on the two ends the model cannot police itself:

- The model cannot reliably refuse an input it was not built for, so you check at the
  **input** boundary, deterministically, before it runs.
- The model cannot tell you its plausible output is wrong, so you watch the **output**
  against its own history and let a human adjudicate the outliers.

Everything fancier (full schemas, golden tests, eval suites) is good and additive. These two
are the cheapest things that move you from "fails silently in week three" to "fails visibly
on the first odd input."

## When NOT to use this

- **One-shot, human-reviewed output.** If a person reads every result before it matters, the
  deviation monitor is redundant; keep the input check anyway, it is nearly free.
- **Genuinely unbounded creative tasks** where there is no baseline a deviation could be
  measured against. Then your guard is a human review step, not a monitor.
- **Do not over-tighten the input check** into rejecting valid-but-novel inputs. Start strict,
  log what it rejects, and loosen deliberately. A boundary that cries wolf gets disabled, which
  is worse than no boundary.

## In this folder

- [`reference/`](./reference): a runnable TypeScript implementation of both guards. An
  `InputBoundary` that rejects malformed input before the agent runs, and a `DeviationMonitor`
  that flags outputs straying from a rolling baseline. The `demo()` shows a clean run, a
  malformed input caught at the boundary, and a silently-drifted output getting flagged.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
