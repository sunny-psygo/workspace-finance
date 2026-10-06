# The second time the same kind of problem appears, fixing it in place is no longer allowed

**The first time, fixing it in place is fine. The second time a problem with
the same root cause appears, stop and trace upward.**

## How to do it

On the second occurrence, write down the chain of questions before deciding
where to change:

> Why does this problem exist → why can this state occur → why does this
> place need to know about this?

Trace until the level where **"changing it here makes this whole class of
problems disappear together"**.

**The output doesn't have to be an immediate refactor.** It can be just a
record: where the root cause is, how it should be changed, and why it isn't
being changed now. With a record, the third occurrence doesn't require
deriving it all over again.

## Effect

The one-time cost of fixing in place is always the lowest, so without a
trigger condition it stays the "rational" choice forever — until the system
is full of patches. **"The second time" is a cheap and unambiguous braking
point**: the first time it doesn't disturb you, the second time it forces you
to look up.

Signals of the same kind: a design stuck between two bad options, needing a
very strange parameter to cover both, a special case that has grown its own
special case.

## Counter-effects and boundaries

- **"The same kind" is counted by root cause, not by phenomenon.**
  Two null pointers are not necessarily the same thing. Counting by
  phenomenon makes this fire wrongly and often, and after a few times nobody
  takes it seriously.
- **Don't escalate it.** The end of the questioning is "the level that makes
  a class of problems disappear", not "rewrite the whole system". Reaching
  "so everything has to be refactored" usually means you traced too far.
- **A production incident stops the bleeding first.** This governs what
  happens after the bleeding stops, not a design discussion opened in the
  middle of the fire.

From [dig to the root](../principles/dig-to-the-root.md).
