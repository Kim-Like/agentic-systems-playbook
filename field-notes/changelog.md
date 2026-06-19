# Change log: building in the open

What I changed in how I run my agents, and why. Newest first. Each entry is a real decision,
described at the level of the pattern, never the internals. If a change is worth a full
write-up, it graduates to the library and I link it from here.

---

## 2026-06-01: A new publishing surface should be manual until the platform trusts the account

I wired an agent to post to a platform on its own, and the platform quietly blocks the
automated upload path for new, low-history accounts. The right move was not to fight it with
workarounds. It was to make that one surface **operator-posted by hand**: the agent produces a
complete, finished artifact, and a human places it. Everything else the agent does on that
platform stays automated. The lesson that generalizes: when a platform gates a capability for
a new account, do not engineer around the gate. Split that surface off as manual, ship the
agent's output as a finished thing a person can post in one step, and automate the rest. The
boundary you already built (review, then a human acts) makes this a config choice, not a
rewrite.

## 2026-05-31: Cap the rate at which the agent DRAFTS, not just the rate it sends

I had a daily cap on how much the agent could *send*, and felt covered. Then the review queue
filled with far more drafts than a person would ever approve in a day, and the queue itself
became the problem: noise, not throughput. The fix was a second, separate cap on how many
items the agent *drafts* per day, sized to a human's real review capacity. The lesson: a send
cap protects the outside world; a draft cap protects the reviewer. You need both, and they are
different numbers. An agent that drafts faster than anyone can review is not productive, it is
generating a backlog that hides the items that matter.

## 2026-05-27: When you supersede a path, delete it, do not leave it as a "fallback"

I replaced an approach and left the old one in place, reasoning it was a harmless fallback.
It was not harmless. Dead code that is wired in but never meant to run reads as supported, and
the next person (or the next agent) trusts it, or worse, it fires in an edge case you forgot
about. Now when I supersede a path, I remove it in the same change and say so. A clean
deletion is a feature. A lingering "just in case" path is a trap with good intentions.

## 2026-05-23: The spawn is the attack surface, sandbox it by default

A product feature let an authenticated user drive an agent that could run tools. The spawn
inherited more than it needed: a broad home directory, a permissive tool set, ambient
credentials. None of it was exploited, but the surface was wrong by default. I now treat any
agent subprocess spawned on behalf of a user as hostile-by-default: isolated working
directory, a read-only or plan-only permission mode, an explicit allowed-tools list, and no
inherited credentials. The boundary goes on at spawn time, not after something goes wrong.
