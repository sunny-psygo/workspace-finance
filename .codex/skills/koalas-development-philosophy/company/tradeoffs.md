# What Creative Koalas wants

[Seek truth from facts](../principles/seek-truth-from-facts.md) says: different
purposes have different elegances, and the standard has to be derived from
the purpose. **This page is the standard Creative Koalas derived.**

## The ordering

**The simplicity and elegance of the code come before backward compatibility,
before performance, and before user experience that isn't very important.**

What gives way: backward compatibility, a few percentage points of
performance, harmless details of the experience.

**Robustness and production stability are not among the things that give
way** — because they don't contradict elegance at all:
**elegant code is usually itself robust and stable in production**, and more
robust than code that "sacrifices technical beauty for the sake of
robustness". **Robustness that has to be piled up out of a heap of patches
is usually the amateur's approach** (see
[excellence is the default](../principles/excellence-by-default.md): real
stability comes from making the error impossible, not from patching).

## Why this ordering

**One: we are an AI startup. Everything is changing, and the code changes
every day.**

So **whether something is easy to change, and whether changing it will break
things, matters far more than whether an interface can last ten years or
whether the user can wait half a second less** (see
[what code is](../principles/what-is-code.md): we are always in the
development phase, and code is judged by how many more times it will be
changed).

**Two: our competitiveness is a dimensional advantage in fundamental
technology, not percentage points on the engineering side.**

Competing with others over those few percentage points on the engineering
side wins you no moat even if you win. What fundamental technology competes
on is **iteration speed and elegance** — not backward compatibility, not
those few percentage points. Spending effort where it can form a dimensional
advantage is the real reason for this ordering.

**The above is the general case. Special cases get special analysis** —
this page is itself a product of
[seeking truth from facts](../principles/seek-truth-from-facts.md), not a new
dogma.

## When backward compatibility is genuinely needed

Some things can't be avoided. The most typical is **user data**. The
approach:

1. **Hold to the principle of leaving as little backward-compatibility
   branching in the code as possible.** When adaptation is needed, prefer to
   accommodate the new code through **actions on the data side and the
   deployment side** — migrate the data, deploy in batches — rather than
   having the code support two formats forever. A compatibility branch in the
   code lives on indefinitely; a data migration ends when it is done.
2. **Do the design up front so this situation happens as rarely as
   possible**; and when it really happens, it must be doable **safely and
   with zero downtime** (see
   [upfront design beats firefighting](../principles/upfront-design.md)).

## What this page is not

- **It is not neglecting users.** User data, privacy, and money must not go
  wrong, as always.
- **It is not abandoning performance.** What gives way is a few percentage
  points, not an order of magnitude — a performance problem of an order of
  magnitude is usually a design problem in the first place.
- **It is not permission to take production down.** Zero downtime is a
  requirement, not an option.
