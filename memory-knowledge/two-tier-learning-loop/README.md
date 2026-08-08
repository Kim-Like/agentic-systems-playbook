# Two-tier learning loop (cheap triage, expensive synthesis)

> Do not run your best model over the whole firehose. A cheap, local triage pass decides what is
> worth attention; only the keepers reach the expensive synthesis tier, bounded by a hard
> per-run cap. The cost of a learning loop should be a number you chose, not a number you
> discover on the bill.

If your agent learns by reading a stream (news, docs, tickets, a feed) and turning some of it
into durable knowledge, the naive version sends every item to a frontier model. That is slow and
its cost scales with the size of the world, which is unbounded. This pattern makes the cost
scale with a cap you set instead.

## The problem

The firehose is mostly noise. Of a hundred incoming items, maybe a handful are worth remembering;
the rest are duplicates, off-topic, low-signal, or restatements of what the agent already knows.
If you run your most capable (and most expensive) model on all hundred to decide *and* to
synthesize, you pay frontier prices to mostly conclude "ignore this". Worse, the bill grows with
the stream: a busy day costs more, an upstream that doubles its volume doubles your spend, and
there is no ceiling. Cost you cannot bound is cost you cannot plan around.

## The pattern

Two tiers and a cap.

**1. A cheap triage tier decides relevance.** A small, fast, ideally local model (or even a
heuristic) looks at each item and answers one narrow question: is this worth the expensive tier?
It does not synthesize, summarize deeply, or reason hard. It filters. Running a small model over
the whole stream is affordable precisely because it is small, and "is this relevant" is a far
easier task than "what should I learn from this", so a cheap model is good enough at it.

**2. An expensive synthesis tier processes only the keepers.** The items triage kept go to your
capable model, which does the real work: extract the durable claim, judge it against the agent's
values, write the note. This is where the quality and the cost both live, so it only ever sees
the small, pre-filtered set.

**3. A hard per-run cap bounds the expensive tier.** Even after triage, cap how many items reach
synthesis in one run. If triage keeps more than the cap, the overflow waits for the next run.
This is the structural cost bound: expensive calls per run can never exceed the cap, no matter
how large or noisy the stream is. The bill has a ceiling you set, not one the firehose sets.

## Why the cap matters more than it looks

Without the cap, triage alone is not a real bound: a flood of genuinely-relevant items (a big
news day, a backfill, a first run over a large backlog) would pass triage and hit the expensive
tier all at once. The first-run case is the classic trap: the very first time you point the loop
at an existing archive, *everything* is "new", and an uncapped loop tries to synthesize the
entire history in one pass. The cap turns that from a cost spike into a steady drain: the backlog
clears over several runs at a fixed rate, and nothing ever exceeds the budget. The system
self-heals at a pace you chose.

## The shape, in order

```
  stream ──cheap triage (all items)──▶ keepers ──cap──▶ expensive synthesis ──▶ durable knowledge
            small/local model,                  per-run    frontier model,
            "is this worth it?"                  bound      "what do I learn?"
```

Cost per run is roughly: (stream size x cheap-unit) + (min(keepers, cap) x expensive-unit). The
first term is small because the unit is small; the second is bounded because of the cap. Total
cost has a ceiling regardless of stream size.

## When NOT to use this

- **A small, already-curated input** where every item genuinely deserves the expensive tier.
  Then triage is overhead; just synthesize them (still cap it, for safety).
- **When triage is as expensive as synthesis.** The pattern only pays off when the filter is
  genuinely cheaper than the work. If your "cheap" tier is another frontier call, you have not
  saved anything; find a smaller model or a heuristic for the filter.
- **Latency-critical single items** (one user request, answer now). This is for a background loop
  over a stream, not for a real-time path where there is nothing to triage.

## In this folder

- [`reference/`](./reference): a runnable two-tier loop. A cheap `triage()` filters a stream, a
  hard `perRunCap` bounds how many keepers reach an expensive `synthesize()`, and a cost counter
  proves the bound. The `demo()` runs a large noisy stream through it, shows the expensive calls
  never exceeding the cap, compares total cost against the naive "synthesize everything"
  approach, and then drains the leftover backlog over subsequent runs at the capped rate.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
