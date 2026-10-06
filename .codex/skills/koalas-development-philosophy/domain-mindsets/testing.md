# Testing

**The purpose of testing is to keep the code from going wrong — at least from
going badly wrong.** Testing has no value in itself. It is a means. So the
first question is always "how do we keep it from going wrong", not "how do we
write more tests".

## The ideal is needing no tests

Per [dig to the root](../principles/dig-to-the-root.md): the best place to
solve a bug is not a test case. It is making the bug **simply unable to
happen**.

So the first priority is always design: **make the error inexpressible**, or
at least make **serious errors** (data leaks, charging the wrong amount) hard
to express (see
[excellence is the default](../principles/excellence-by-default.md)).
Serverless can't get at anyone else's state; a Next.js backend has exactly
one definition — the bugs these structures eliminate outnumber anything any
test suite blocks.

**Using a test to plug an error that design could have eliminated is a
second-best solution.** In practice there is of course a part that design
cannot eliminate, and the four points below are about what to do with that
part.

## 1. Write tests with restraint

**The nature of a test means it is necessarily coupled to the implementation**,
and so it necessarily expresses the same thing twice. This is the same kind
of problem as the frontend and backend interfaces not matching, or the docs
and the implementation not matching (see
[documentation](documentation.md)), and tests are the **harder-to-maintain
kind of code**.

**Adding a test is not just adding a test. It is taking on a debt**: every
later change to the implementation has to be followed by manually changing
the test along with it. And we are
[always in the development phase](../principles/what-is-code.md) — the code
keeps changing, so this debt keeps rolling.

## 2. The return has to be weighed against the cost

**Both correctness and robustness should be moderate, not maximized.**

- **Logic involving money or privacy must not go wrong.**
  But note: the **safer** approach in such a place is to make it impossible
  to go wrong, not to plug it with tests — a test can only cover the cases
  you thought of, while a structural constraint covers all of them.
- **Harmless behavior doesn't need to be watertight**: what color a button
  is, how many seconds between refreshes of a like count. Pursuing absolute
  correctness for these spends the entire cost on things that don't matter.

Keep asking: **is adding this test worth it?**

## 3. Prefer high-level tests

Integration tests are the most high-level, unit tests the most low-level.
**Prefer the former.**

- **The more high-level, the closer to the purpose**: it tests "can this
  thing actually be accomplished", which is exactly what you really care
  about. It couples lightly to the implementation, and most changes to the
  implementation don't require touching it.
- **The more low-level, the closer to the implementation**: the coupling is
  heavy, a change to the implementation drags the test along with it, and it
  easily becomes maintenance hell — **the test isn't protecting you, you are
  feeding it**.

In terms of the [code gradient](../principles/excellence-by-default.md):
low-level tests steepen the gradient of the whole codebase, because moving a
little turns a pile of tests red.

Unit tests are not forbidden. They are **reserved for places where the logic
is complex, the boundaries are many, and it is genuinely worth pinning down
on its own**.

## 4. Keep a test as close as possible to the thing it tests

The reason is exactly the same as
"[a description of the implementation sits next to the implementation](documentation.md)":
**the closer it is, the harder it is to diverge, and the clearer it is what
has to change along with what.**

Rust's test system is a good example — the test is written right beside the
code it tests, so you cannot fail to see it while changing the
implementation. When choosing technology and organizing code, prefer the
approach that can do this.
