# Excellence is the default

**Great design makes the good thing natural and the bad thing unnatural.**

> Excellence is the default norm; badness needs trying hard.

Excellence should not be something you have to strive for. It should be what
happens when you do nothing in particular. Writing something bad should take
real effort, enough effort that you can't bring yourself to finish it.

## A bug is a spectrum, not a switch

A **bug here means everything that is "bad"**: crashes and logic errors, and
also awkwardness in the user experience, sluggishness in performance, messy
structure, and debt in readability and maintainability.

And it **is not binary**. There is no line between "has a bug" and "has no
bug", only a continuous spectrum from "marvelously right" through "barely
runs" to "explodes at a touch".

So the goal is not the binary goal of "eliminate bugs". It is **to change the
distribution of difficulty along the whole spectrum**:

> **The better the practice, the less effort it takes; the worse the
> practice, the more effort it takes.**

Design comes in three grades, and they describe exactly this distribution:

1. **In a bad design**, the good practice and the bad practice are equally
   easy, or the bad one is easier. The result is then certainly bad — this is
   not a problem with the people, it is a problem with the default.
2. **A good design** blocks the bad practice and handles the consequences the
   bad practice causes. (Through defense, validation, documentation, and
   discipline, and the cost is paid continuously.)
3. **A great design** makes the good practice the path of least resistance,
   and makes the bad practice so awkward you can't finish writing it.
   **The limiting case is that the bad practice cannot be expressed at all**
   — like Newspeak in *1984*: it doesn't forbid anti-government speech, it
   removes the words from the language, so that meaning **simply cannot be
   said**.

One corollary of the third grade:
**a great design often needs no exception handling, because an exception is
simply impossible.**

## Three grades of engineer

- **A bad engineer**: no exception handling in the code.
- **A good engineer**: a pile of exception handling in the code.
- **A great engineer**: very little exception handling in the code again —
  because the exceptions were killed before they were born.

Note that the first grade and the third look identical from the outside:
both have "barely any exception handling". So don't judge by quantity. Judge
by this question:

> **Why is this exception impossible?**

If you can give a structural reason ("no code path can construct this
state"), it is the third grade. If you can't, or the answer is "it probably
won't happen", it is the first grade.

## Two concrete examples

**In a serverless architecture, a state mismatch simply cannot occur.**
Each request runs inside one function, and you **cannot get** another
request's data. It is not "be careful not to share state". There is no such
thing as shared state for you to get wrong. A whole class of concurrency and
state-corruption bugs disappears, along with the locks, the cleanup, and the
defensive checks written for them.

**In Next.js, a frontend/backend interface mismatch simply cannot occur.**
The backend is represented as a function, and that function **has exactly one
definition**. The sentence "the interface the frontend calls doesn't match
the interface the backend implements" is literally inexpressible in this
representation. No interface-doc sync mechanism, no contract tests, no
version negotiation — the problem isn't solved, it doesn't exist.

What the two examples share: neither **added** a safeguard. Both **removed**
the thing that let the error exist (shared mutable state, a second
definition of the interface). And after the removal, **the correct way of
writing it is also the least effortful way** — that is what actually makes
them powerful.

## The code gradient

"The better the practice, the less effort" still sounds like a feeling. Its
measurable form is the **code gradient**:

How do you judge whether a piece of code is good? **Don't look only at how
it is now. Look around it.** Make a small change to it — how bad do the
consequences get? That is its gradient.

- **A steep gradient = a singularity.** Change a little and something may
  break. This is not good code, **even if it currently runs and its behavior
  is completely correct** — it merely happens to be sitting on a correct
  point, and everywhere around it is a pit.
- **A flat gradient = good code.** The maintainer can barely break anything
  serious no matter how they abuse it. In other words, **breaking it takes
  real effort**.

**Correctness is a property of a point; the gradient is a property of a
neighborhood.** Accepting only correctness is a bet that everyone who changes
it later will never step half a step wrong. And code will be changed — by
other people, by yourself three months later, by an agent.

Look at Next.js again: no matter how the developer abuses it, one user's data
flowing to another user is nearly impossible — unless the database has no RLS
**and** the code contains a very strange, very conspicuous data-fetching bug.
Both have to be hit together before anything happens. That is a flat
gradient.

"Make the bad practice inexpressible" is exactly the limiting case of the
gradient: in that direction, **there is no worse way of writing it to take**.

So the question to ask in review is not "is this written correctly". It is:

> **At this spot, what mistake is a person who doesn't know the full context
> most likely to make? And how serious is it if they do?**

If the answer is "very easy to make, and it leaks data", the code has a
problem, even if this version of it is completely correct.

## How to use it

First measure with the overall ruler:

> **In this design, is the path of least effort the best path?**

If it isn't, that is a problem with the design, not with the user's lack of
conscientiousness. Don't respond by adding rules, checklists, and training —
that asks people to fight the default, the cost is paid forever, and it will
eventually be lost. **Change the default itself.**

When a class of problem keeps recurring, don't first ask "how do we guard
against it". Ask:

> **What representation would make this problem impossible to write?**

The common routes are all, at bottom, subtraction:

- **Remove the second source of truth.** When the same fact has exactly one
  definition, there is no bug of the kind "the two places disagree".
- **Remove sharing.** What you can't get at, you can't corrupt.
- **Make illegal states unconstructable.** Keep them out with types and
  construction entry points, rather than validating them after they have been
  constructed.
- **Turn a call that can fail into a call that cannot.** Anything decidable
  at compile time or construction time should not be left to be judged at
  runtime.
- **Make the good practice the default.** Writing in the most convenient way,
  configuring nothing, should produce the version that is correct, fast, and
  readable.

The bug in the broad sense follows the same rule, with the question reworded:
"how do I make this interaction impossible to misuse?" (see
[product and interaction design](../domain-mindsets/product-design.md)),
"how do I make this slow query impossible to write?", "how do I make it
impossible to put this logic in the wrong place?"

## Relation to the other principles

- This is the expansion of the sentence "**a bug is unnatural**" in
  [upfront design beats firefighting](upfront-design.md): when the cognition
  is right, the good practice is the natural one, and the bad practice
  becomes awkward on its own. Whether you can bend the distribution of the
  spectrum is the best ruler for whether the abstraction was chosen right.
- It and claim 5 of [minimalism](minimalism.md) are two sides of one thing:
  that one says "**don't write a branch for a case that cannot happen**",
  and this one says "**find a way to make more cases impossible**". The
  better the design, the more defensive code you can honestly delete.

## What this rule is not

- **It is not "don't write error handling".**
  Real-world failures — the network drops, the disk fills up, the user types
  nonsense, a third-party interface returns a field you've never seen —
  always exist and must be handled honestly. What can be eliminated is **the
  class of problem caused by your own code's structure**, not all of them.
  Copying this rule without distinguishing the two gives you the code of a
  first-grade engineer.
- **It is not piling on type gymnastics and frameworks in order to eliminate
  problems.** If the price of "making the bad practice unwritable" is three
  layers of generics and a homegrown framework, you have moved the complexity
  from one place to another, usually to the worse place. The mark of a
  third-grade design is that **there is less**, not more.
- **It is not relying on discipline and rules to make people do well.**
  Needing people to exert effort to meet the bar is itself evidence that the
  default is set wrong. A rule is the last patch, not the first means.
