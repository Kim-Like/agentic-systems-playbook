# Kill-switches that ship OFF

> Ship the capability dark. A new way for an agent to act should arrive inert by default, turn
> on by a deliberate flip, and turn off again with zero data loss. The flag is not an
> afterthought. It is part of the capability.

This is the discipline that makes [review-gated autonomy](../review-gated-autonomy) safe to
roll out. The boundary tells you nothing acts without approval; the kill-switch tells you that
even approved actions only flow when you have deliberately turned the tap on, and that you can
turn it off in one move.

## The problem

Capabilities go live on deploy. You build "the agent can now send emails," merge it, and the
moment it is on the server it is doing it, at whatever volume the code allows, before you have
watched it once. If it misbehaves, your options are panic: revert the deploy, comment out
code, pull the plug on the whole service. There is no calm "turn just this off" because the
capability and its on-switch are the same thing: the deploy.

## The pattern

Three properties. A capability has all three or it is not done.

**1. Inert by default.** A new capability reads a flag that defaults to OFF. Deploying it
changes nothing observable. It is present, tested, and dark. Going live is a separate,
deliberate act (flip the flag), not a side effect of shipping the code.

**2. Layered switches: one global, one per capability.** A global master kill-switch disables
everything regardless of the per-capability flags, so you have a single "stop now" in an
incident. Under it, each capability (each surface, each action type) has its own flag, so you
can enable email while leaving posting and deploying off. Both must be ON for a capability to
act. The global flag is your big red button; the per-capability flags are your rollout dial.

**3. Reversible to manual with zero data loss.** Turning a flag OFF must not lose work. The
review queue still fills, approvals still record, drafts still wait. The only thing that stops
is the automated send. With everything off, the system is exactly the manual version of itself:
slower, fully functional, nothing dropped. That is what makes flipping a switch off a calm
decision instead of a gamble.

## Read the flag at use time, not at boot

Read flags where the action happens, on each cycle, not once at startup. If you cache the flag
at boot, flipping it requires a restart, and a restart in an incident is exactly the friction
you were trying to avoid. A flag you can flip and have respected within seconds, with no
deploy and no restart, is the difference between a control and a decoration.

## Where the flags live

Keep them in runtime configuration the operator controls (environment, a config row, a feature
flag service), never hard-coded and never in the agent's own writable state. The agent must not
be able to turn on its own capabilities. The on-switch belongs to the human, by construction.

## A note on naming and defaults

- Default OFF means *absent or empty is OFF*. Do not make "unset" mean "on"; a forgotten
  variable should fail safe, not fail open.
- Name flags for the capability, not the implementation (the surface and action, not the
  library). The operator reading the switch list should understand what each one unleashes.
- One capability, one flag. Resist a single mega-flag that gates five unrelated things; you
  lose the ability to enable them independently, which is the whole point of the per-capability
  layer.

## When NOT to use this

- **Read-only or internal-only capabilities** with no outside effect. A flag there is noise.
- **A flag per trivial function.** Gate *capabilities that can affect the world or cost money*,
  not every code path. Too many flags is its own failure mode: nobody knows the live state.
- **Do not let OFF quietly drop work.** If turning a capability off loses queued items instead
  of holding them, you have a data-loss bug wearing a kill-switch costume. Fix the holding
  behavior first.

## In this folder

- [`skill/`](./skill): an installable skill that makes "ship it OFF, behind a flag, reversible
  to manual" the default way an agent adds any new world-affecting capability.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
