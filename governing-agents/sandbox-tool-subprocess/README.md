# Sandboxing a tool-enabled subprocess

> If your product lets a user drive an AI that can run tools, the process you spawn is your
> attack surface. Treat every such subprocess as hostile by default: its own working directory,
> a read-only or plan-only mode, an explicit allow-list of tools, and no inherited credentials.
> Put the boundary on at spawn time, not after something goes wrong.

This is the boundary for a specific, dangerous shape: a feature where an **outside user**
indirectly controls an agent that can **execute tools** (run code, read and write files, call
commands, hit the network). The user does not call your agent directly, so it is easy to forget
that their input is now steering a process with real capabilities on your machine.

## The problem

You build a helpful feature: a user types a request, your backend spawns an agent subprocess to
handle it, the agent has tools so it can actually do useful work. Convenient, and quietly
dangerous. By default a spawned process inherits the parent's environment: the same home
directory, the same credentials sitting in environment variables and config files, the full
tool set, the ability to read and write anywhere the parent can. Now an authenticated user's
text is, transitively, instructing a process that can read your secrets and write your files.
Nobody intended that. The spawn just inherited everything, because that is what spawns do unless
you stop them.

The damage does not require a malicious genius. Prompt injection in the user's input, a
confused agent following instructions it found in a fetched page, or a simple bug is enough.
The fix is not smarter prompts. It is a smaller blast radius.

## The lockdown (apply all of it, by default)

Six controls. They are cheap, they go on at spawn time, and together they shrink the surface to
almost nothing.

1. **Isolated working directory.** Give the subprocess its own scratch directory and point its
   home and working directory there. It should not be able to see the parent's home, the
   project tree, or anything outside its sandbox. A process that cannot reach your files cannot
   leak or corrupt them.

2. **Read-only or plan-only mode by default.** Start the agent in the least-capable mode that
   still does the job: planning or read-only. Grant write or execute only for the specific
   feature that genuinely needs it, narrowly. Most user-facing agent features need far less
   capability than the default grants.

3. **An explicit allow-list of tools.** Enumerate the tools the feature needs and disallow
   everything else. Allow-list, never deny-list: a deny-list is a promise to remember every
   dangerous tool forever, including the ones added next release. The allow-list fails safe.

4. **No inherited credentials.** Do not pass the parent's environment through. Build the
   subprocess's environment explicitly, containing only what that feature requires (often
   nothing sensitive at all). The agent a user is driving must not be able to read a credential
   the user was never entitled to.

5. **Bound it: time, output, and resources.** A wall-clock timeout, an output cap, and limits on
   what it can consume. A sandboxed process that can still run forever or fill the disk is only
   half-sandboxed.

6. **Treat the input as untrusted, always.** The user's text (and anything the agent fetches) is
   adversarial input, not instructions you trust. The sandbox is what protects you when the
   prompt-level defenses are bypassed, and they will be.

## Defense in depth, not either-or

These controls overlap on purpose. If the tool allow-list has a gap, the isolated directory
still contains the damage. If the directory isolation has a hole, the absent credentials mean
there is little to steal. You are not picking one; you are layering them so a single miss is not
a breach. The whole point of "by default" is that you do not have to predict the specific
attack; you remove the capability before anyone needs to.

## A real shape of this failure

The common version: a product ships a feature where a logged-in user can chat with an agent that
can run tools, and the spawn is set up quickly, inheriting the operator's home directory, full
tool access, and the credentials in the environment. It is never exploited in testing, because
testers do not attack it. It is wrong by default the whole time. The lesson generalizes past any
one incident: the spawn is the surface, and "it has not been exploited yet" is not a control.

## When NOT to use this

- **A subprocess only YOU drive,** with no outside user in the loop, where the inputs are
  trusted. Still scope its tools and credentials on principle, but the full hostile-by-default
  posture is aimed at user-facing spawns.
- **Agents with no tools at all** (pure text generation, no execution, no file or network
  access). There is little surface to sandbox; the relevant control there is output gating, not
  process isolation.
- **Do not let "sandboxed" become an excuse to skip input validation and auth.** The sandbox is
  the last layer, not the only one. Authenticate the user and validate the request too.

## In this folder

- [`skill/`](./skill): an installable skill that makes "spawn it sandboxed: isolated directory,
  least-capable mode, tool allow-list, no inherited credentials, bounded, untrusted input" the
  default whenever an agent subprocess is spawned on behalf of a user.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
