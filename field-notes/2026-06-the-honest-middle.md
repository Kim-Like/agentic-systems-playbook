# The honest middle on agent autonomy

_June 2026_

There are two confident camps about AI agents right now, and both are selling you something.

One camp says agents are about to replace whole teams, that you are a quarter away from a
company that runs itself, that if you are not "agentic" you are already behind. The other camp
says agents are a parlor trick: a good demo, a fragile reality, a thing that falls over the
moment it meets a real workflow. Each side has a clip that proves it. The replacement camp has
a flashy run where the agent does in a minute what took an afternoon. The dismissal camp has
the screenshot where it confidently does the wrong thing.

Both clips are real. Neither is the answer, because both are describing the demo, just with
opposite emotions about it.

Here is what I actually see, running agents that do real work every day.

The agents are genuinely good at the part everyone films: taking a fuzzy instruction and
producing a competent first pass, fast. That is not a trick. It is a real shift in where the
bottleneck sits. The work that used to be gated by someone having an afternoon free is now
gated by something else.

And the something else is the entire game. Because the agent is also genuinely good at
producing a competent-looking *wrong* pass, fast, and it will not tell you which one you got.
It does not crash on the input it was not built for. It reasons its way to an answer, hands it
over with the same fluent confidence it uses for the right ones, and moves on. The failure
mode is not a stack trace. It is a plausible result that is wrong in a way nobody notices for
three weeks.

So the dismissal camp is right that the demo is not the product. But they draw the wrong
conclusion. The gap between the demo and the product is not proof that the technology is a toy.
It is a description of the work you actually have to do. The work is not "get the agent to
produce output." That part is close to solved. The work is building the boundary around the
output: deciding what the agent may do without a human, validating what comes in before it
runs, watching what goes out against its own history, and keeping one switch that turns the
whole thing off cleanly. That is unglamorous, and it is most of the job, and it is exactly the
part the replacement camp skips because it does not demo well.

The replacement camp is right that throughput goes up. They are wrong that it goes up by
removing the humans. It goes up by moving the humans. The afternoon someone used to spend
producing the first pass, they now spend reviewing five first passes and catching the one that
is subtly wrong. That is a real multiplier. It is also still a person, doing judgment, on
purpose. The companies that will get burned are the ones that heard "it runs itself" and
removed the reviewer.

If you want a single test for whose advice to trust, it is this: ask them what happens when the
agent is wrong. The replacement camp usually has not thought about it, because in the demo it
was not wrong. The dismissal camp says "exactly, it is always wrong," which is also not true.
The people worth listening to answer in terms of boundaries. They tell you where the human
sits, what gets checked before the agent runs, what gets flagged after, and how you stop it.
They are bored by the demo and interested in the 3am input.

Agents are not going to replace your team this year, and they are not a toy. They move the
constraint from "who has time to do the work" to "how good is the system that does it." That
is a smaller-sounding claim than either camp is making, and it is the one that has held up
every single day I have run this.

---

*Written by **Kim Like**, AI and automation consultant. I build and run autonomous agents in production and advise teams at [aienterprise.dk](https://aienterprise.dk). More field notes and patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
