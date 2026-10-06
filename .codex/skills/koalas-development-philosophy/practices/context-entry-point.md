# A repo needs "what this is, and why"

**What cannot be read out of the code has to be written down, and written in
two places: the short version in the always-loaded file (`AGENTS.md` /
`CLAUDE.md`), and the full text in `design/`.**

## Why two places

- **The always-loaded file is loaded every time**, so what is placed there,
  the AI carries **at all times**. That is exactly what we want: it always
  has the right cognition, rather than waiting until it remembers to go look.
  The cost is that it occupies context every time, so only the **short
  version** can go there.
- **The full background, context, and design philosophy go in `design/`**,
  pointed to from the always-loaded file. This kind of thing doesn't
  correspond to the implementation's structure in the first place, and
  stuffing it into a docstring makes both sides hard to read (see
  [documentation](../domain-mindsets/documentation.md)).

When the reader who matters is the person judging the work, the full text
can be the [living report](living-report.md), which puts it in the order a
person judges in: eucalyptus's report replaced its design README. A precise
contract that agents need gets its own note, linked from the page rather
than restated in it.

## What to write

Write only what **cannot be read out of the code**:

- What this thing **is**, positioned at the level of cognition (flash or
  familiarity? A trendy AI app or national-scale infrastructure?)
- Why the current abstraction was chosen, and **what was rejected at the
  time**
- The boundary: **what does not belong to this system**
- Which constraints are real, and which are only historical leftovers

Interfaces, flows, and module diagrams don't belong here — those are the
things that [sit next to the implementation](../domain-mindsets/documentation.md).

## Effect

"If the context isn't enough, go ask" requires conscientiousness from people
and agents. **Putting the context on the path they must travel is the
structural solution.**

For an agent this is a hard requirement: without this layer of cognition it
falls back on "the most common way of writing it", and the most common way is
almost certainly not the one you want — and it will write it fast, and it
will look self-consistent.

## Counter-effects and boundaries

- **It goes stale, and this kind of document stale is worse than absent** —
  it talks about "why", and once it is wrong, every later decision follows it
  into the wrong. The copy in the always-loaded file **must be small enough
  to be maintained in passing**; the one in `design/` is not written once and
  locked in a drawer either.
- **Don't let `design/` become a documentation warehouse.** It holds
  cognition and philosophy, not an archive of requests and meeting notes.
- **Being unable to write it is a signal** that this repo's purpose itself
  hasn't been thought through yet, and that is the problem actually worth
  solving right now.

From [what a repo is](../principles/what-is-a-repo.md) and
[cognition](../principles/cognition.md).
