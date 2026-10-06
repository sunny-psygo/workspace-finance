# Cognition: the ability to define things

**A developer's most important ability is the ability to define things.**

Cognition and abstraction are two sides of one thing: abstraction is saying
clearly what something is. So the most fundamental content of "design" is
not drawing structure or picking a tech stack. It is forming a cognition
(see [upfront design beats firefighting](upfront-design.md)).

## There is a cognition at every level

- **Of the whole product**: what are we actually making?
- **Of a module**: what role does it play in the system?
- **Of a function**: what does it promise, and what does it not promise?
- **Of a variable**: what does it actually stand for?

From product design down to a single variable declaration, the ability
required is the same. The only difference is that sometimes you define
consciously, sometimes subconsciously, and **most often unconsciously — and
the unconscious ones are exactly the easiest to get wrong**, because when
they are wrong nobody stops to check.

When the cognition is designed well, everything looks natural, and **bugs
simply don't arise, because a bug is unnatural**
(see [excellence is the default](excellence-by-default.md)).
The reverse holds too, and it is a very useful signal:
**a place that can only be kept standing by patches is usually not an
implementation written wrong. The cognition there was wrong from the
start.**

## Cognition needs enough context

This is the point most easily skipped, and the one with the largest cost:

> **A definition made from a fragment is certainly a wrong definition.**

And in practice, not having the whole picture is the normal case:

- **In a team, everyone is often like the blind men and the elephant**,
  holding only one point of the whole animal: one ticket, one issue, the
  notes from one meeting. Define from that point and the abstraction you get
  is necessarily deformed — it holds for that point and fails for every
  other one.
- **Someone who uses AI badly also fails to give the AI the full context.**
  So the AI is feeling the elephant too, and it feels fast and fluently,
  writing a great pile of self-consistent but misaligned things along that
  single point.

So **both humans and AI have to actively understand where they stand**:

1. **Judge first**: do I hold the whole picture, or one point?
2. **If something is missing, go fill it in**: read the code upstream and
   downstream, ask the person who raised the request, figure out what the
   request is actually trying to solve, and see whether someone has already
   solved the same kind of problem.
3. **What you cannot fill in, write down explicitly as an assumption**,
   rather than silently treating it as fact.

**Only with a more complete background can you have a better cognition and a
more accurate abstraction.** Conversely, skipping this step and starting to
write is the source of the second mode of decay in
[minimalism](minimalism.md) — build too literally. It is not that the person
doesn't want a general design. The single point in their hand cannot yield
one.

## How to use it

- **A context self-check.** Before starting, ask: who uses this thing? What
  is upstream and downstream of it? Why is it being done now? What happens
  if it isn't? Who else has touched this area? The more of these you can't
  answer, the less you should rush to write.
- **Naming is a physical for the cognition.** A name that won't come out
  right, that can only be `data`, `info`, `manager`, `handle`, is usually
  not a vocabulary problem. You haven't figured out what the thing is yet.
- **A one-sentence definition.** If you can't say it, or can only say it as
  a tautology ("a manager for managing X"), the cognition hasn't formed.
- **Repeatedly having to add special cases** is a signal that the definition
  is wrong. Patching further at that point is doubling down. The right move
  is to go back and rethink "what is this thing, actually".

This matters especially for AI: **when you receive a task, first judge
whether the context is enough. If it isn't, go read and go ask before
writing to the letter.** Writing to the letter is the fastest, and it is
also the easiest way to write a misaligned design.

## What this rule is not

**It does not require omniscience before you may start.** Context is never
complete, and waiting until it is means paralysis. What it requires is:
**you know where you stand and what you lack, and the missing part is either
filled in or explicitly marked as an assumption.** The most dangerous state
is not insufficient information. It is insufficient information you don't
know you have.
