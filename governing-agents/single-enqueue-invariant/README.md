# The single-enqueue invariant

> If you cannot point at the one function that lets your agent affect the world, you cannot
> reason about its blast radius. So make that function singular, and write a test that fails
> the day someone adds a second one.

[Review-gated autonomy](../review-gated-autonomy) gives you a chokepoint: one function that
moves work toward a side effect. This pattern is how you keep it one function as the codebase
grows and as other people (and other agents) touch it. An invariant that is only true today is
not an invariant. An invariant a test enforces is.

## The problem

Side-effecting paths multiply quietly. The first version has one place that sends. Then someone
adds a "quick" background job that sends directly because routing through the queue felt like
overkill. Then a retry script. Then an agent writes a helper. Six months later, "what can this
system send, and who approved it" has six answers in six files, and your review gate is a
suggestion. Nobody decided to weaken it; it eroded one reasonable shortcut at a time.

## The pattern

Two parts: make the writer singular, and make a test guard it.

**1. One writer, and make it hard to bypass.** All side-effecting records (the queue rows, the
outbound items, whatever your agent acts on) are created by exactly one function. Everything
else calls that function. Make bypassing it require effort: keep the raw write private to one
module, expose only the chokepoint, and route every caller through it.

**2. A test that greps for bypasses and fails the build.** Write a check that scans the source
for the low-level write call and asserts it appears in exactly one place: the chokepoint. The
day a contributor adds a second direct writer, the check goes red and explains why. This turns
"please always route through enqueue" (a wish) into "the build will not pass otherwise" (a
rule). It is a few lines and it is the cheapest governance you will ever write.

## Why a grep test and not just code review

Code review catches what the reviewer happens to notice. An invariant this important should not
depend on someone remembering it at 5pm on a Friday. A grep-style test is dumb, fast, and
tireless: it does not get distracted, and it documents the rule in executable form, so the next
person learns the invariant by tripping it, not by reading a wiki nobody reads.

It is intentionally a *textual* check, not a clever AST analysis. Simple and slightly
over-strict beats clever and silently-wrong here. If it false-positives on a legitimate case,
you add an explicit, reviewed allow-comment, which is exactly the deliberate exception you want
on the record.

## The corollary: add the second writer ON PURPOSE, or not at all

Sometimes you genuinely need a second enqueue path (a different trigger, a different policy).
That is allowed. What is not allowed is a second path appearing by drift. When you add one, you
add it to the invariant explicitly: the test now expects exactly two named writers, and the new
one is documented as a deliberate decision with its own justification. The point of the
invariant is not "always exactly one." It is "the set of writers is a short, named, reviewed
list, and nothing joins it by accident."

## When NOT to use this

- **Pure functions and read paths.** The invariant is for side effects. Do not bureaucratize
  code that cannot affect the outside world.
- **Throwaway prototypes** you will not operate. The discipline pays off when the system runs
  unattended and others contribute; a weekend script does not need it.
- **Do not let the test become a maze of allow-comments.** If you are adding exceptions
  constantly, the chokepoint is in the wrong place. Move it, do not paper over it.

## In this folder

- [`reference/`](./reference): a runnable check. It models a tiny "codebase", exposes a single
  `enqueue()` chokepoint, and includes `assertSingleWriter()` that scans the sources and fails
  when any module other than the chokepoint performs the low-level write. The `demo()` runs the
  check on a compliant codebase (passes), then on one where a background job writes directly
  (fails, naming the offending file), then on one that declares a second writer deliberately
  (passes again).

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
