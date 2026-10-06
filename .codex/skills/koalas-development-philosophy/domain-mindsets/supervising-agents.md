# Supervising agents: the owner's understanding is the bottleneck

**When agents write the code, the scarce resource is no longer code. It is
the understanding and judgment of the person who owns the work.** One person
supervising several agent sessions moves only as fast as they can tell, for
each session, what was done, whether it is right, and what to decide next.
So everything an agent hands its owner is measured by one thing: **how
cheaply it lets them judge correctly.**

## Why it matters: unjudged work drifts

Past some number of sessions, one more session only adds work nobody has
judged, and unjudged work drifts. Kit is the example. Codex, Claude Code,
and Grok sessions evolved it on their own for weeks. When the history of its
design notes was traced, partial checkout, the role-delegation DAG, and the
security history had each been removed, mostly to fit a line budget, and
each removal was written down as a "limitation". The code stayed
self-consistent and the checks stayed green, but it no longer solved the
problem it was meant to solve (see
[documentation](documentation.md): keep only the means, and every update
drifts a little from the purpose). Nothing put those deviations in front of
the owner, so nobody saw them.

## The chat is the wrong home for understanding

Terminal output is a stream. It is ordered by when the agent did things, not
by what the owner needs to judge. It scrolls away and dies with the session,
the next session and the sessions next to it can't see it, it speaks the
agent's vocabulary, and none of its claims can be checked from inside it.
Several sessions produce several streams.

**What the owner needs to understand more than once belongs in the
workspace**, beside the work and maintained with it: the
[living report](../practices/living-report.md). It is a means of production
like the tests and the skills (see [what a repo is](../principles/what-is-a-repo.md)),
so it lives in the repo and nowhere else. The chat carries what is
transient: a question that needs an answer now, and a pointer to the page.

## Explain top-down

**Judgment runs from the abstract to the concrete, so explanation does
too:** first principles → the idea behind the design → the design → the
implementation architecture → how to try it yourself.

- **A wrong first principle invalidates everything under it**, so the reader
  checks it first and stops at the first layer that is wrong. That layer is
  also where the fix is cheapest (see [dig to the root](../principles/dig-to-the-root.md)).
- **The top layers are where the owner judges best and the agent worst**:
  purpose, positioning, what the thing is. At the bottom it is the reverse.
  The order spends the owner's attention where it counts.
- **Each layer is justified by the one above.** Each first principle forces
  a property ("fit runs both ways, so Match scores both directions"). The
  idea is the one move that satisfies them, and the design makes it
  concrete. The architecture implements it, and trying it is the one check
  that doesn't depend on believing any of the above.

If an explanation won't come out in this order, the design usually wasn't
derived in this order either.

## Speak the core abstraction, not the implementation

**Explain and argue in the terms of the system's model.** In Kit, an agent
described a problem as "the plan points at file C", and the owner had to
ask: "Aren't files materialization of nodes?" Restated in the model, where
files are views of nodes and edges, most of the problem dissolved. Later an
agent recommended scoping a command because it would "delete machinery".
It argued from code size, the premise was false, and the owner re-derived
the answer from the model: "Always reason from the core abstraction first."

- In the implementation's words, the owner has to rebuild the model before
  they can check you. In the model's words, they check you against the model
  they already hold.
- An explanation that needs the implementation's words to hold together is a
  sign that the design leaks (see [documentation](documentation.md): length
  is a physical for the design).
- A term the owner doesn't share gets defined with a concrete example from
  the real system: a real pair of posts, a real token, not a made-up one.

## Make every decision decidable

A question to the owner is part of the report, so ask it so that it can be
answered correctly in a minute. **An uninformed yes is not a decision.** How
to make a question decidable, with the Match example, is in
[if something is missing, ask](../practices/ask-when-unsure.md).

## Evidence, not assertion

**The report is written by the party being judged.** Its default leans
toward "done" and toward agreeing (see [have a view](../principles/have-a-view.md)).
So a report is worth what the owner can check without trusting its author:

- numbers produced by the code that measures them, never typed in;
- commands the owner can run, with the output to expect;
- estimates stated before the work and measured after, with the gap
  explained. Kit reports every slice that came in above its range;
- negative findings given as much room as wins, and every deviation from the
  design named as a deviation. "Limitation" is the word drift hides behind;
- what was deliberately not built, kept apart from what fell short.

Some questions an agent can't answer about its own work: can a newcomer read
this, would a user get stuck? That evidence comes from an
[independent agent](../practices/engineered-context.md).

## Write for the reader you have

The owner is not a student. Often they wrote the principles being applied.
In eucalyptus, the owner answered an agent's careful justification of routine
git mechanics with "Don't play the 'learn git yourself' thing with me."
**Say what only you know** — what you found, what you decided, what you need
— and skip what they already know.
[Explaining the reasoning](../practices/teach-and-guide.md) is for a reader
growing their judgment, and its biggest risk is lecturing.

## What this is not

- **It is not more reporting.** The goal is less of the owner's time per
  correct judgment. A longer report that costs more to read is worse, which
  is why the living report stays short.
- **It does not replace the owner's own hands.** "Try it yourself" comes
  last because it is the only layer that doesn't pass through the agent.
- **It does not ask the owner to read every line.** They judge direction,
  decisions, and evidence. What they need is exactly what lets them stop
  reading the diff.

From [what a repo is](../principles/what-is-a-repo.md) (the understanding is
a means of production), [attention](attention.md) (a person's attention has
a budget too, and dilution is deletion), and
[dig to the root](../principles/dig-to-the-root.md) (judge the top first).
