# Seek truth from facts

**Code conventions have no universal value.** Whether any practice is good or
bad depends on **what this thing is actually for**. Beware of dogmatism —
this holds for development, and it holds for starting a company too.

## Every "convention" has a cost

- **Backward compatibility**: it makes the code gradually bloated. The world
  outside changes, and you don't even dare to update the tech stack. And a
  tool used internally **needs no backward compatibility at all** — clinging
  to compatibility there is a pure loss.
- **"Production-grade", "robustness"**: they mean complexity, and they often
  push the system toward closed to modification, harder and harder to change
  (see [what code is](what-is-code.md)).
- **Functional programming, OOP, AOP, the various design patterns**: none of
  them is a universal criterion. Each has its own range of applicability.

So **"it conforms to the convention" is not itself a reason.**
The question to ask is: **what does this convention buy here? What does it
cost? Can this project afford that cost?**

## The root is still cognition

The precondition for making a tradeoff is first getting clear on **the
purpose, the positioning, the why**
(see [cognition](cognition.md) and "the purpose has to be defined at the
level of cognition" in [what a repo is](what-is-a-repo.md)).

**Blindly pursuing code conventions is, at bottom, substituting someone
else's answer for your own thinking.** Someone else's answer was derived
under someone else's purpose, and it stops holding when the purpose changes.

## No-self

A mature developer, after having seen every kind of language, every kind of
framework, every kind of design pattern, instead enters a state of
"no-self": **no longer clutching their own tech stack**, but returning to the
origin — back to cognition, back to the purpose.

Tech stacks, paradigms, and patterns all retreat from "identity" back into
"tools". Only then do they truly start designing, rather than applying
templates.

## Returning to the purpose is not demand-driven

This needs saying clearly: **returning to the purpose is precisely the
opposite of being demand-driven.** A request is a scattered, surface-level
appeal; the purpose is a definition at the level of cognition
(see [upfront design beats firefighting](upfront-design.md)).

**Returning to the purpose and to cognition is, in the end, returning to
elegance and to beauty.**

## Seeking truth from facts and elegance are two sides of one thing

**Different purposes have different elegances.**

- The elegance of an internal tool is "it can be changed in five minutes, and
  breaking it affects nobody else".
- The elegance of a piece of infrastructure is "the interface needs no change
  for ten years, and everyone can rely on it".

The same compatibility rule is a burden in the first and a lifeline in the
second. So seeking truth from facts is not the opposite of elegance. It is
the road that leads to it:

> **The ability to think your way from "the purpose" to "what counts as
> elegant here" is itself a kind of elegance.**

That is the way.

## How to use it

- **Before applying a convention, first say what it buys here.** If you can't
  say it, don't apply it.
- **Re-ask under a different positioning**: if this were an internal tool
  used for only three months, would the answer change? If this were
  infrastructure meant to last ten years? If the answer changes, you were
  copying just now.
- **"Everyone does it this way" and "this is industry best practice" are not
  reasons.**
- **Allow different repos in the same organization to have different
  standards.** Different purposes mean the standards should differ.

## What this rule is not

- **It is not an excuse for "write whatever".**
  Seeking truth from facts demands **far more** thinking than copying a
  convention: copying only requires memorizing, seeking truth from facts
  requires arguing.
- **It does not reject experience and mature patterns.**
  They are **candidate solutions**, not edicts (see
  [give the rationale, not just the rule](rationale-over-rules.md)).
- **It is not "have no standards".**
  It is that standards must be **derived from the purpose**, not carried over
  from somewhere else.
