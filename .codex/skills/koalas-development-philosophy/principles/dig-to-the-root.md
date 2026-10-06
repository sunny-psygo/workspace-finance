# Dig to the root

**The best solution to most problems is not where the problem shows up.**

It is far upstream — follow it back a few steps, to some design, some
abstraction, some definition. So when you hit a problem, **don't stare only
at the problem itself**: the real solution is often deeper, and solving it
there costs less too.

## Why

Because **a good design makes a whole class of problems never appear**:

- Structure the code well and many bugs and performance problems never get a
  chance to happen in the first place.
- Design the product well and many pieces of user feedback are never raised
  in the first place.

Put the other way: **the problem you are looking at is very likely just a
symptom of some upstream decision.** Fix it at the symptom and there will be
a next one; fix it upstream and the whole class of symptoms disappears
together (see [excellence is the default](excellence-by-default.md)).

This is also why a feature request cannot be taken literally. The
**phenomenon** the user reports is real; the **solution** they propose may
not be — they can only propose from the small piece they can see (see
[cognition](cognition.md)). Implementing it literally is the shallow
"patch whatever is missing" solution in [minimalism](minimalism.md).

## The single most useful signal

> **When you feel a design is stuck between two bad options, it is probably
> not that this spot is hard. Some design further up has a problem, or you
> haven't thought something through yet.**

"However I write it, it feels wrong." "Each of the two options is half
wrong." "It takes a very strange parameter to cover both." None of these is
a signal to pick one of two rotten options. They are a signal to **go look
one level up**.

Signals of the same kind: the same bug fixed for the third time, a special
case that has grown its own special case, adding one feature that touches
five unrelated places.

## How to use it

**Keep asking upward, until the level where "changing it here makes this
whole class of problems disappear".**

- A bug: why does this bug exist → why can this state occur → why does this
  module need to know about this?
- Performance: why is this slow → why does it happen this many times → why
  does this data have to appear here?
- A request: they want this feature → what do they need it to accomplish →
  what was supposed to accomplish that thing?

Stop at that level. **The criterion is "changing it here makes a whole class
of problems disappear together"**, not "I can still keep asking upward" —
tracing upward has no end, and further up you reach "rewrite the whole
system" and "switch industries", which is not solving the problem.

## What this rule is not

- **It does not forbid stopping the bleeding first.**
  If production is on fire, restore it first, of course. But be clear that
  **stopping the bleeding is not solving it**: mark the temporary patch,
  record the root cause, and come back to it. The worst case is that the
  bleeding stops successfully, so nobody ever looks again.
- **It is not infinite ascent.**
  See the stopping criterion above. Digging is for finding the level that
  solves the problem in one move, not for proving that everything has to be
  redone.
- **It does not dismiss user feedback.**
  The phenomenon the user sees must be taken as real. What you cannot do is
  treat the solution they proposed as the request itself.
