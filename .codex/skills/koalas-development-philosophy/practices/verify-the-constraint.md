# First confirm the constraint is real

**Before designing a workaround for "X can't be done", confirm that it really
can't be done.**

## How to do it

**First state your basis**, and see which kind it is:

- You've read a specific passage of the documentation → you can proceed.
- You've tried it yourself and seen a concrete error → you can proceed.
- **"I have the impression it can't" or "generally it isn't supported" → go
  check before you start.**

The order of checking: read the official docs → run a minimal example once →
ask someone who knows. **This step usually takes a few minutes.**

If you're still unsure after checking, continue on an assumption, but **write
the assumption down explicitly** — in the PR description or right beside that
code, stating "if X actually is supported, this should be deleted".

## Effect

**A workaround is a permanent liability.** Once built, later things depend on
it, and the cost of tearing it out later far exceeds the cost of building it.
And if the constraint doesn't exist at all, what you wrote is superfluous
from the first line — **you didn't solve a problem, you added something the
repo has to maintain forever** (see
[what code is](../principles/what-is-code.md)).

A few minutes of checking against a long-term maintenance cost. This trade is
always worth it.

**This matters especially for AI**: your "impression" of a tool, platform, or
framework comes from training data. It may be outdated, or it may have been
wrong to begin with, and you won't feel uncertain because of that — **which
is exactly the most dangerous part** (see
[cognition](../principles/cognition.md): the most dangerous state is not
insufficient information, it is insufficient information you don't know you
have).

## Counter-effects and boundaries

- **It invites endless research.** One round of checking is enough. If you
  can't find it, proceed with an explicit assumption. Don't turn it into a
  research project that has to finish first.
- **While firefighting, work around it first**, but record the assumption and
  come back to verify it afterward.
- **"The constraint is real" does not mean "the workaround is right".**
  After confirming, ask one more thing: is this constraint grating precisely
  because our abstraction was chosen wrong in the first place (see
  [dig to the root](../principles/dig-to-the-root.md))?

From [cognition](../principles/cognition.md) and
[what code is](../principles/what-is-code.md).
