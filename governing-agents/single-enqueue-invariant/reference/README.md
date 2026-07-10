# Reference: single-writer check

A runnable demonstration of the [single-enqueue invariant](../README.md): a real `enqueue()`
chokepoint, and `assertSingleWriter()`, a static guard you wire into CI so the invariant cannot
erode by drift.

## Run it

```bash
npx tsx single-writer-check.ts
```

## What the demo shows

1. A compliant codebase (one writer, everyone routes through it): the check passes.
2. A background job that grew its own direct write: the check fails and names the file and
   line. This is the drift the test exists to catch.
3. A second writer added deliberately (named in `allowedWriters`): the check passes again,
   because the invariant is "a short, named, reviewed list of writers", not "always one".
4. The real chokepoint writing two items, to show it is not just a string game.

## What to copy

- Keep the low-level write **private to one module** and expose only the chokepoint.
- The guard is a **textual scan**, on purpose: dumb, fast, and tireless beats clever and
  silently-wrong. Run it in CI.
- Provide an **explicit allow-comment** escape hatch so a genuine exception is a reviewed,
  on-the-record decision, not a silent bypass.
- When you truly need a second writer, **add it to the allowed list deliberately** and document
  why. Never let one appear by drift.

## What this is not

The "codebase" here is a map of strings so the file runs on its own. In a real project,
`assertSingleWriter` reads your source tree from disk and runs as a unit test. The idea is
identical; only the input source changes.
