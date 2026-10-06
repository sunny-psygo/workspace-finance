# Technology choice

**The first question is still the same one: what "ought" this thing to look
like?**

Choosing a technology is not picking a tool. It is **finding, for "what this
thing is", a shape that fits its nature** (see
[cognition](../principles/cognition.md)). A wrong choice is usually not the
result of picking a bad tool. It is the result of **not having figured out
what the thing being built is**, and then forcing one shape onto another.

## Criterion one: pick the one that "makes good the default and makes bad uncomfortable"

For the same request, different tech stacks make **entirely different classes
of error impossible** (see
[excellence is the default](../principles/excellence-by-default.md)):

- **Something naturally stateless → serverless.**
  Each request lives inside one function and cannot get at anyone else's
  state, so a whole class of concurrency and state-corruption bugs becomes
  impossible.
- **Something naturally stateful** (such as persistent agent infra) **→
  serverless doesn't fit.** Forcing it means working around it everywhere:
  external state storage, recovery logic, heartbeats, leases… all the
  complexity is spent **fighting the tool** instead of solving the problem.

So the single most useful question when choosing:

> **Am I about to use it with the grain, or work around it?**

If you have to work around it from the start, the choice is wrong. **Don't
expect the workarounds to shrink over time. They only grow.**

## Criterion two: pick the modern, not the archaic

The reason is not novelty. It is that **a modern tech stack usually has
"make the error inexpressible" built in**: a type system, a single
definition (rather than the frontend and backend each writing one), docs and
schemas generated automatically from the code. An archaic tech stack leaves
all of this to people's conscientiousness — and conscientiousness eventually
fails.

There is also a practical reason: **a modern mainstream tech stack has richer
material and more consistent conventions on the AI's side**, so what the AI
writes is more stable in quality and carries fewer strange old idioms. In a
team where people and AI write code together, this is not a small thing.

## The extreme-caution list

The following, **unless absolutely necessary and you can state a good
reason, don't choose**:

- **Any tech stack related to Java.**
- **Any tech stack based on bare HTML / JavaScript / CSS.**

**The second is especially easy to misread, so here is exactly what it
rejects:**

| Rejected | Not rejected |
| --- | --- |
| Bare HTML + bare CSS + bare JavaScript, and archaic styles like jQuery | **Next.js is fine** |
| | **TypeScript is fine** |
| | **Tailwind CSS is fine** |

**The purpose of this item is to keep archaic frontend styles out, not to
reject the JavaScript ecosystem.** "Includes JS" or "supports JS" is not the
problem. The problem is the style with no types, no components, no single
definition, where a person has to remember that changing one place means
changing another place along with it.

**What counts as "absolutely necessary"**: you can state a concrete reason (a
capability only it has, an external constraint that is not negotiable), and
**you write that reason down** — into `design/`, together with "under what
conditions it should be replaced" (see
[a repo needs "what this is, and why"](../practices/context-entry-point.md)).
"The team knows it" and "we've always used it", with no reason stated, don't
count as reasons.

## Other things to look at

- **Whether the docs can be generated from the code** (see
  [documentation](documentation.md)).
- **Whether tests can sit next to the implementation** (see
  [testing](testing.md)).
- **Whether types and structure can eliminate a whole class of error**,
  rather than convention and review.

Familiarity and popularity rank after these.

## What this is not

- **It is not following whatever is newest.** The criterion is "which class
  of error does it make impossible", not how new the version number is. A
  newborn framework that locks you inside its abstraction is equally
  [working around it](../principles/composition-over-configuration.md).
- **It is not permission to ignore real constraints.**
  A client mandate, a regulatory requirement, an existing system that must be
  reused — these are all real inputs (see
  [seek truth from facts](../principles/seek-truth-from-facts.md)). The list
  blocks "picked it because it was at hand", not "thought it through and
  still picked it".
