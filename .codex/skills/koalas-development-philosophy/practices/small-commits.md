# Small commits

**One commit does one thing, and the title says it in one sentence.**

## How to do it

- Commit refactoring and feature changes separately — a diff that mixes them
  can't be read.
- The commit message says **why it was changed this way**. What changed is
  already in the diff.
- Commit as you go. Don't save it all up for the end.

## Effect

- When something goes wrong, it can be reverted on its own, without dragging
  unrelated changes along.
- The reviewer doesn't give up on reading carefully because the diff is too
  big.
- Being interrupted halfway doesn't lose the part that is already done.

## Counter-effects and boundaries

Splitting too finely fills the history with "fix a typo", "fix another typo",
and you can no longer see how one thing was accomplished.
**The criterion is "can this commit be stated in one sentence, and is
reverting it on its own safe"**, not "the fewer lines the better".

From [what code is](../principles/what-is-code.md): code is constantly being
changed, and the history is for those future changes to read.
