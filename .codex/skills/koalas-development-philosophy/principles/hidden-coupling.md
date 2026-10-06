# Beware of coupling you can't see

**The most dangerous coupling is not the kind where code imports back and
forth. It is two things sharing a concept or an expectation that was never
written down.**

The former, a compiler, an IDE, and a dependency graph can all help you find.
The latter is in no dependency relationship at all, and **it only shows
itself when something has already gone wrong**.

## Three layers, more hidden the further down

### 1. The interface layer: the same contract implemented twice

Two systems meet at an API surface, and that surface is in fact implemented
twice — once on the providing side, once in the assumptions of the using
side. Change one side and the other doesn't error. It only fails to match at
runtime.

This layer has a solution: **give it exactly one definition** (in Next.js the
backend is a function, and "the frontend and backend interfaces don't match"
is simply inexpressible; see
[excellence is the default](excellence-by-default.md)).

### 2. The concept layer: two features share one concept and each interprets it

One page shows "remaining credit", another shows "credit breakdown".
**What "credit" actually is** — does it include what was given for free? Does
it include what has been reserved but not yet settled? If there is no single
definition, the two sides each interpret it, and then slowly stop matching,
and they **stop matching right under the user's eyes**.

In the code these two pages may have nothing to do with each other. Grep
finds no common point. What they actually share is a word.

### 3. The user-expectation layer: one feature shapes a habit, another silently depends on it

The most hidden layer, because it isn't even in the code.

- Operations in this interface have always been undoable, so users develop
  the habit of "do it first, think later"; one day, in the same place, you
  put a deletion that **cannot be undone**.
- Lists have always been "the newest is at the top"; another page reuses the
  same component but sorts by relevance instead.
- One input box has always filtered locally; another box that looks identical
  **sends a request and charges for it**.

The code is entirely unrelated, the tests are all green, but **the user acts
on the old habit and gets hurt**. The user's expectation was trained by your
own product — **that is an interface too, only it is written in no file.**

## Why it is especially dangerous

- **It isn't in the dependency graph**: grep can't find it, the type system
  doesn't govern it, and review can't see it.
- **Its damage is silent**: it doesn't error, it only "disagrees" — and by
  the time someone notices, it is usually a user or finance who noticed.
- **It gets heavier over time**: every feature you add is one more reference
  point for that implicit concept, and no mechanism is counting them.

## What to do

- **Make the shared concept explicit, and give it one definition.**
  Best is "exactly one definition"; failing that, at least have both sides
  read it from the same place.
- **Name the concept first, and write it down.**
  What "credit" means goes on that page of
  ["what this is, and why"](what-is-a-repo.md).
  **A concept that cannot be named will certainly be interpreted differently
  by each side.**
- **When changing something, the question is "who else depends on this
  concept, this expectation", not "who imported this file".**
- **At the experience layer, use consistency rules instead of judging case by
  case**: things in the same place with the same appearance must behave as
  the same kind. **To break that expectation, you must break it visually
  too**, so the user can see that this time is different.

## What this rule is not

- **It does not require every shared concept to be extracted into a common
  module.** A wrong abstraction is far more expensive than duplication. The
  criterion is **whether they are the same concept**, not "whether they look
  alike" (see [composition over configuration](composition-over-configuration.md)).
- **It does not forbid reusing components.**
  Reusing the appearance is fine, and different semantics are fine too — but
  then the user must be able to **see** that it is different.
