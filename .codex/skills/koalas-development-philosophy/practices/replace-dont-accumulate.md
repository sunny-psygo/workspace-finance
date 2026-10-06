# Before adding, say what it replaces

**Every time you add a capability, you have to be able to answer: what does
it replace?** If the answer is "it replaces nothing", first confirm that
nobody is already doing this thing.

## How to do it

- Before adding, search once: is there already something in this repo doing
  the same thing?
- If there is, **change it**, or **replace the old one with the new one and
  delete the old one** — don't leave two side by side.
- When the old and the new genuinely need to coexist (a gradual rollout, a
  data migration, say), **coexistence must come with an end condition**:
  write down "the old one is deleted when this condition is met", and the
  condition has to be decidable ("after all user data has been migrated"
  works; "once things stabilize later" does not).

## Effect

Coexisting capabilities of the same kind are the main source of bloat, and
every instance of coexistence **looks perfectly reasonable at the time**: the
old one is too scary to touch, the new one is better to use, so both stay.
By the time there is a third, nobody knows which to use, and nobody dares to
delete any of them.

Making "what does it replace" a question that must be answered at the moment
of adding sets a checkpoint at the entrance of that road, rather than waiting
to clean up after it has grown — cleanup never makes it to the top of the
priority list.

## Counter-effects and boundaries

- **The biggest risk is it being used to forcibly unify two things that are
  actually different.** A wrong abstraction is far more expensive than
  duplication. The criterion is **whether they solve the same problem**, not
  "whether they look alike".
- **When you aren't sure, coexistence is allowed** — but the end condition
  must be written down. "Coexist for now" is fine in itself. "Coexist
  indefinitely" is the problem.
- **It doesn't apply to the transition period of an external dependency**:
  when you're bound by someone else's pace, write the end condition as their
  milestone, not as a date you force.

From [minimalism](../principles/minimalism.md) and
[what code is](../principles/what-is-code.md).
