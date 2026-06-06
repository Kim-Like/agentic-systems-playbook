# Reference: deviation guard

A single-file implementation of the two guards from
[the demo-to-production gap](../README.md): an `InputBoundary` that rejects malformed input
before the agent runs, and a `DeviationMonitor` that flags output straying from a rolling
baseline.

## Run it

```bash
npx tsx deviation-guard.ts
```

(Any TypeScript runner works. No dependencies.)

## What the demo shows

1. Seven normal inputs: the boundary passes them and the monitor warms up its baseline.
2. A malformed input (a quantity that arrived as a string): **rejected at the boundary**, with
   a reason, before the agent runs. The agent never improvises on it.
3. A well-shaped input whose output silently drifted (a unit price defaulted to a stale
   value): the boundary passes the *shape*, and the monitor flags the *value* at a 90 percent
   deviation, so it surfaces for review the same day instead of weeks later.

## What to copy

- The boundary **rejects loudly** and reports *why*, including unexpected extra fields. A
  differently-shaped input is precisely the production surprise a demo never produces.
- The monitor **excludes flagged values from its own baseline**, so one outlier cannot drag
  the baseline toward "normal" and hide the next one.
- A flag is **"look", not "wrong".** Route flags to a human; do not auto-reject on a flag.

## What this is not

The checks here are illustrative (shape, type, range, a single numeric deviation). A
production version layers a real schema validator, more than one tracked signal, and persists
the baseline across restarts. The shape of the idea does not change: validate at the input
boundary deterministically, and watch the output against its own history.
