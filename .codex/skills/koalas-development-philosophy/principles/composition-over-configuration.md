# Composition over configuration

**Composition over configuration. The difference is coupling.**

- **Configuration**: one large, all-encompassing thing, whose behavior is
  controlled by parameters.
- **Composition**: a set of small, orthogonal parts, assembled into the
  behavior you want.

Both can make a system "variable", but the costs are entirely different.

## Why configuration breaks

**Configuration binds every user to the same entity.**
Each parameter you add means that entity has to handle another batch of
combinations internally; parameters also affect each other, and the number of
combinations grows exponentially. So:

- Change the semantics of one parameter and **every user is affected
  together** — nobody dares to change it.
- To add a new behavior, you can only add another parameter, and the entity
  keeps growing.
- What tests have to cover is the **combinations**, not the number of
  options, and coverage becomes impossible quickly.

The more fundamental problem:

> **Configuration can only cover the dimensions of change you thought of in
> advance.**

Parameters are the few axes you reserved. While requests move along those
axes, everything looks beautiful. **But a real, large change never lands on
an axis you set in advance.** Then you find that every config option, and
every branch written to support them, has become baggage all at once — which
is why a big product update breaks everything.

Under the traditional eye, configuration often looks beautiful: one unified
entry point, control in one place, behavior changed without writing code,
"configurable" sounding powerful. **That is beauty under a static view.** It
assumes the world will only ever move along the axes you drew.

## Why composition is different

Parts connect only through **narrow, general interfaces**, and know nothing
of each other's existence. So:

- Replace one part and **only the people using it are affected**.
- Adding a new behavior is **adding a new part**; existing parts don't change
  a single line.
- A part you don't use simply doesn't participate. It is no cognitive burden
  and it doesn't enter the test matrix.
- **You can assemble things you didn't think of at the start** — because the
  space of combinations is not one you reserved.

The Unix pipe is the classic example: combinations like
`grep | sort | uniq` were never "designed" by anyone. They grew naturally out
of a narrow interface (the byte stream). Conversely, a giant tool with two
hundred flags can only ever do the combinations of those two hundred flags.

## How to tell

When a request changes, ask yourself:

> **Am I changing the semantics of a parameter (every user affected along
> with it), or replacing / adding a part (only the people using it
> affected)?**

A few accurate signals:

- **Boolean parameters.** A function with a `flag` parameter usually means it
  is really **two functions**.
- **`if (config.x)` scattered through the implementation.** The configuration
  has seeped into the core logic. It is no longer "a choice made outside"; it
  is a branch inside.
- **The config options are still growing.** By the third or fourth, stop and
  ask: were these supposed to be different parts all along?
- **The documentation starts containing "combination notes"** ("when A is
  true and B is false, C has no effect") — the combinatorial explosion has
  already happened.

## Relation to the other principles

- It is the special case of
  [provide building blocks, not features](building-blocks.md) along the
  single axis of "how to accommodate change": that one is about aggregation
  versus building blocks, this one is about parameters versus parts.

- Claim 6 of [minimalism](minimalism.md) says "configuration is the last
  resort". That one is about **not rushing to add config options**; this one
  is about **where to go if you don't add them**.
- It is the precondition of being
  [open to modification](what-is-code.md): a highly coupled system can't be
  changed, so the only move left is to keep wrapping layers around the
  outside, until it grows into something nobody dares to touch.
- The ability to compose comes from narrow, general interfaces, and whether
  an interface is narrow depends on whether you have figured out "what this
  thing actually is" (see [cognition](cognition.md)). **Composition is not a
  coding technique. It is a byproduct of having chosen the right
  abstraction.**

## What this rule is not

- **It is not "there can be no configuration".** The distinction is whether
  you are configuring **data** or **behavior**: ports, keys, timeouts, and
  log levels are **just filling in values**, and they should be
  configuration; "which flow to take", "which algorithm to use", "whether to
  do this step" are **behavior**, and those should be composition.
- **It is not splitting things as finely as possible.**
  Parts should be **orthogonal and each complete in itself**. Splitting out a
  pile of fragments that depend on each other and mean nothing alone only
  moves the coupling out of the parameters and into the call relationships,
  which is usually worse.
- **It is not "having a plugin system means it's composition".**
  If a plugin can only hang on the few hooks you reserved, it is still
  configuration, just written in a more expensive way: the hooks are the
  axes, and you can still only move along them.
