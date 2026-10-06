# What code is

Before writing code, get clear on **what code itself is** — of all the
things to define, this is the one to get right first
(see [cognition: the ability to define things](cognition.md)).

Two claims, and you have to hold both at once, always:

1. **Code is a means, not an end.** It is the cost you have to pay to reach
   the goal.
2. **Code is developing, not something you write and then leave sitting
   there.** It keeps getting changed.

Most bad engineering decisions are one of these two forgotten.

## 1. Code is a means: so it is a liability

**The ability to solve the problem is the asset; code is only the price of
getting it.** So buying the same ability means paying as little as possible.
Every extra line adds a liability to the books, not an asset.

And that liability keeps paying interest:

- **Cost of understanding.** Every part has to be re-understood by the next
  person and the next agent.
- **Surface area for bugs.** Code you never wrote cannot have a bug; a
  dependency you never introduced cannot have a CVE.
- **Cost of change.** Parts drag each other along, and the cost of a change
  grows faster than linearly with the number of parts. Superfluous
  abstractions and config options are especially lethal: they turn "change
  one place" into "change one place and verify every combination".

In the AI era this account is more expensive: an agent, like a person, is
limited by how much context it can read at once. Extra material in the repo
slows both sides at the same time — and every change pays the cost again.

The direct corollary: **"how much did this PR write" is the wrong metric.**
**Deleting code pays down debt. It is a gain, not a loss.**

## 2. Code is developing: so judge it as if it will be changed a thousand times

**The era of "development is done, now we enter maintenance" is over, and
the era of "write the software and then lie back and collect money" ended
long before that.** A modern company is always moving forward, and new
features are always in development. **We are always in the development
phase.**

So you cannot judge a piece of code by "does it run right now". Judge it by
"it will be changed a thousand more times — how expensive will those
thousand times be?" The moment the code is written, its cost has only just
started.

### Corollary one: making bad practice inexpressible matters more than ever

**We cannot afford the cost of debugging.**
Always being in development means always pushing new things into a system
that is already running. Maintaining quality by "wait until something breaks,
then investigate" is a pure loss at that pace. The only approach that pays
is stopping the problem before it is born — which is why
[excellence is the default](excellence-by-default.md) is a hard requirement,
not an aspiration.

### Corollary two: don't be "open to extension, closed to modification"

The traditional OCP (open to extension, closed to modification) is wrong
today. Its premise is "existing code should not be touched", so every change
can only be absorbed by **adding a layer**: a subclass, a strategy, an
adapter, a switch. Each one complies, each one leaves the old code alone,
and then you have a system nobody dares to delete and nobody can describe in
full — exactly the two modes of decay in [minimalism](minimalism.md) working
together.

What we want is:

> **Open to extension, and open to modification (open to both extension AND
> modification).**

**The goal is not to make the code need no changes. It is to make changing
it both safe and cheap.**

- To change its behavior, do you **edit that code**, or can you only **wrap
  another layer around it**? If wrapping is the only option, it has already
  stiffened.
- **Is deleting a feature easy?** A system where adding is easy and deleting
  is hard is destined to only ever grow.
- After the change, **how do you know you didn't break something else?**
  If the answer is "by being careful", the
  [gradient](excellence-by-default.md) of that code is too steep.

## The two must be used together

Remembering only the first produces code that is **minimal but rigid**:
cheapest today, immovable later. Remembering only the second builds
extension points and config options ahead of time for "future change" —
which is exactly the features-before-necessity that
[minimalism](minimalism.md) warns about.

Together they are the complete goal:

> **Trade as little code as possible for as much modifiability as possible.**

Most of the time the two don't conflict; they cause each other. Less code
means fewer entanglements, which means easier to change; a more accurate
abstraction means the places you have to change are more concentrated. When
they genuinely seem to conflict, the abstraction is usually the wrong one
(see [dig to the root](dig-to-the-root.md): being stuck between two bad
options is usually a problem one level up).

## How to use it

- **Before writing, total the account**: how many times will this code be
  changed? Code that is written once and never touched again barely exists.
- **A request you can satisfy by deleting code, don't satisfy by adding
  code.**
- **Don't lend yourself "we'll refactor later".** Always being in the
  development phase means there is never that free "later".
- **In review, look at the liability, not the output.**
  The question to ask is "did this PR make every future change more
  expensive, or cheaper?"
