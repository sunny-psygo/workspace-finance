# Playbook: hitting a bug

## Steps

1. **Judge the severity first.** Anything involving data, privacy, or money:
   stop the bleeding first, restore first. **But stopping the bleeding is not
   solving it**: mark the temporary patch, and record the root cause.

2. **Reproduce it, and reduce the reproduction to a minimal case.**
   If you can't get it down to a minimal case, that usually means you still
   haven't figured out exactly which conditions it depends on.

3. **Ask "why can this state occur", not "which line is written wrong".**
   Which line is wrong only tells you how to patch it.

4. **Check whether this is the second time.**
   The second occurrence of the same root cause may not be fixed in place
   (see [the second occurrence of the same kind of problem](second-occurrence.md)).

5. **After fixing it, ask one more thing: how do we make this whole class of
   bug have no chance to occur?** If structure can eliminate it, eliminate it
   (remove the sharing, remove the second source of truth, make the illegal
   state unconstructable). Only what structure cannot eliminate is worth
   catching with a test (see
   [excellence is the default](../principles/excellence-by-default.md) and
   [testing](../domain-mindsets/testing.md)).

6. **Record the root cause, not the phenomenon.**
   "Clicking export occasionally shows a white screen" carries no
   information. "Export reuses the request-scoped cache, and concurrent
   requests cross" does.

## Counter-effects and boundaries

- **Step 5 makes small bugs slow to fix.**
  So it is mandatory only where **being wrong is expensive**: data, privacy,
  money, and the ones that have already recurred. A button in the wrong
  color — fix it and move on.
- **Don't do design while firefighting.** Steps 3 through 5 happen after the
  bleeding has stopped.
- **Not every bug has a deep root cause.** Some are just a typo. If two
  levels of questioning find nothing to follow, stop.
