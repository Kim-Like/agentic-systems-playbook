---
name: sandbox-tool-subprocess
description: Use this when code spawns an AI/agent subprocess on behalf of an OUTSIDE user and that subprocess can run tools (execute code, read/write files, run commands, access the network). It locks the spawn down by default: isolated working directory, least-capable (read-only/plan) mode, an explicit tool allow-list, no inherited credentials, resource bounds, and untrusted-input handling. Do NOT use it for subprocesses only you drive with trusted input, or for agents with no tool access at all.
author: Kim Like
homepage: https://aienterprise.dk
source: https://github.com/Kim-Like/agentic-systems-playbook
license: MIT
---

# Sandbox a tool-enabled subprocess

When the task spawns an agent subprocess that a user (directly or indirectly) can steer AND that
subprocess can run tools, the spawn is the attack surface. Do not let it inherit the parent's
power. Lock it down at spawn time, by default, before anyone needs it.

## When this applies

A feature where an outside user's input reaches an agent subprocess that can execute code, read
or write files, run commands, or hit the network. If the subprocess is only driven by you with
trusted input, or the agent has no tools at all, this is not the tool (scope tools/credentials
on principle, but skip the full hostile-by-default posture).

## The procedure (apply ALL of it)

1. **Isolated working directory.** Spawn it with its own scratch directory as home and working
   directory. It must not see the parent's home, the project tree, or anything outside the
   sandbox.

2. **Least-capable mode by default.** Start in read-only or plan-only. Grant write/execute only
   for the narrow part of the feature that truly needs it.

3. **Explicit tool allow-list.** Enumerate the tools the feature needs; disallow everything
   else. Allow-list, never deny-list (a deny-list forgets the dangerous tool added next release).

4. **No inherited credentials.** Do not pass the parent environment through. Build the child
   environment explicitly with only what the feature requires, often nothing sensitive.

5. **Bound it.** A wall-clock timeout, an output cap, and resource limits. A sandbox that can run
   forever or fill the disk is half a sandbox.

6. **Treat the user input (and anything the agent fetches) as untrusted/adversarial.** The
   sandbox is what saves you when prompt-level defenses are bypassed.

## Acceptance checks

- [ ] The subprocess cannot read the parent's home, project files, or anything outside its
      scratch directory.
- [ ] It runs in the least-capable mode that does the job; write/execute is granted narrowly.
- [ ] Tools are an explicit allow-list; everything else is disallowed.
- [ ] The child environment is built explicitly; no parent credentials are inherited.
- [ ] There is a timeout, an output cap, and a resource bound.
- [ ] User input and fetched content are handled as untrusted; auth and validation still happen
      upstream.

## Anti-patterns to refuse

- Spawning with the parent's full environment, home directory, and tool set inherited.
- A deny-list of "dangerous" tools instead of an allow-list of needed ones.
- Passing credentials into a process a user can steer "because it was easier".
- No timeout or output bound on a user-triggered subprocess.
- Trusting the prompt to keep the agent in line, with no process-level boundary behind it.
- "It has not been exploited" treated as evidence the spawn is safe.

## Related

A specific, high-stakes application of **review-gated autonomy** and **kill-switches that ship
OFF** (least capability by default). All in the agentic-systems-playbook.
