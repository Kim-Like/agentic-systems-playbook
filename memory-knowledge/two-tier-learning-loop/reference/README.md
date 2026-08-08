# Reference: two-tier loop

A runnable two-tier learning loop for [the pattern](../README.md): a cheap triage filter over the
whole stream, an expensive synthesis tier on the keepers, and a hard per-run cap, with a cost
meter that proves the bound.

## Run it

```bash
npx tsx two-tier-loop.ts
```

## What the demo shows

A 100-item stream with 20 genuinely relevant items and a per-run cap of 5:

1. Run 1 triages all 100 cheaply, synthesizes only 5 (the cap), carries 15 keepers over. The
   expensive tier never exceeds the cap.
2. Cost so far is 200 units vs 2000 for "synthesize everything", about a 90% saving.
3. The 15-item backlog drains over runs 2 to 4 at 5 per run, with zero re-triage (carried items
   are already triaged). No cost spike, ever.
4. Totals: 100 cheap + 20 expensive calls. The expensive tier ran once per relevant item and
   never more than the cap per run.

## What to copy

- Triage answers **one narrow question** (keep or drop), so a small/local model is good enough.
- The **cap is the real bound**: without it, a big day of relevant items would hit the expensive
  tier all at once. The cap turns a spike into a steady drain.
- **Carry over, do not re-triage.** Keepers that exceed the cap are already triaged; next run
  synthesizes them first and spends no cheap calls on them.
- The first run over an existing backlog is the classic cost trap; the cap is what makes it
  self-heal instead of bankrupt you.

## What this is not

`triage` here is a regex and `synthesize` is a stub, with illustrative cost units (1 vs 20). In
production, triage is a small local model and synthesis is your frontier model; the cost units
are real prices. The two tiers, the cap, and the carry-over are the parts that transfer.
