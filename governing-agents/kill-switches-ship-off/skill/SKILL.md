---
name: kill-switches-ship-off
description: Use this when you are shipping a NEW capability that can affect the outside world or cost money (a new send/post surface, a new action type, an automated path that was previously manual). It makes the capability inert-by-default behind a runtime flag, layered under a global master switch, reversible to manual with zero data loss, and respected at use time without a restart. Do NOT use it for read-only or internal-only code.
author: Kim Like
homepage: https://aienterprise.dk
source: https://github.com/Kim-Like/agentic-systems-playbook
license: MIT
---

# Kill-switches that ship OFF

When the task adds a way for an agent to act on the world (a new surface, a new action type, or
flips a previously-manual step to automatic), do not let it go live just because it deployed.
Put it behind a flag that ships OFF, and make turning it off again lossless.

## When this applies

Any new capability with an outside effect or a cost: sending, posting, deploying, spending,
mutating shared state, or automating a step a human used to do. Skip it for read-only or
purely-internal code.

## The procedure

1. **Gate the capability on a flag that defaults OFF.** Absent or empty means OFF (fail safe,
   never fail open). Deploying the code must change nothing observable until the flag is
   flipped.

2. **Add two layers: a global master switch and a per-capability switch.** Both must be ON for
   the capability to act. The global one is the single "stop everything now" for an incident;
   the per-capability one is the rollout dial that lets you enable one surface at a time.

3. **Read the flag at use time, on each cycle.** Never cache it at boot. Flipping it must take
   effect within seconds, with no deploy and no restart.

4. **Make OFF lossless.** With the flag off, the system must degrade to its manual form: the
   queue still fills, approvals still record, work still waits. The ONLY thing that stops is the
   automated action. Turning it off must never drop queued work.

5. **Put the switch where the operator controls it,** in runtime config (env, a config row, a
   flag service). Never hard-code it, and never let the agent write its own flag. The on-switch
   belongs to the human.

6. **Name it for the capability,** not the library, and keep it one-flag-per-capability so
   surfaces can be enabled independently.

## Acceptance checks

- [ ] Deploying the capability with no config change does nothing observable (it ships dark).
- [ ] An unset/empty flag is OFF. There is no value of "unset" that means ON.
- [ ] A global master switch disables the capability regardless of its own flag.
- [ ] Flipping the flag is respected within seconds, with no restart.
- [ ] With the flag OFF, queued work is retained and the manual path still works; nothing is
      dropped.
- [ ] The agent cannot enable its own capability; the flag lives in operator-controlled config.

## Anti-patterns to refuse

- A capability that is live the instant it deploys, with no flag.
- "Unset means on" defaults (fail-open).
- Reading the flag once at boot, so changing it needs a restart.
- A single mega-flag gating several unrelated capabilities.
- An OFF state that drops queued work instead of holding it.
- Storing the switch where the agent (not the operator) can change it.

## Related

Pairs with **review-gated autonomy** (the boundary the flag controls) and **the
single-enqueue invariant** (so there is one place the flag has to gate). Both are in the
agentic-systems-playbook.
