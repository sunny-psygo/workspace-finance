# Programmatic first

**For every Creative Koalas product — internal and external — the user
experience is designed programmatic-first.**

- **The primary user is a programmatic user**: someone writing a script,
  another piece of code calling it, and the AI agent doing the work on a
  user's behalf.
- **Every capability must have a programmatic interface.** API here is broad:
  a library function, a CLI, a network interface, a protocol, a file format
  all count.
- And that interface itself has to be **elegant, building-block oriented, and
  ergonomic** (see
  [provide building blocks, not features](../principles/building-blocks.md)
  and [the ergonomics of programmatic use](../domain-mindsets/programmatic-ergonomics.md)),
  not "we happened to expose one too".

## Why this is our choice

This is not a universal truth. It is derived from our situation (see
[seek truth from facts](../principles/seek-truth-from-facts.md)):

- **Our users arrive carrying a general agent**, and what an agent uses is
  not the interface, it is the API (see
  [the three boundaries](../domain-mindsets/three-boundaries.md)).
- **Everyone inside the company has an agent**, so the first user of an
  internal system is in fact the agent.
- **An interface is composable; a UI is not.** Composable means someone else
  can build things with it that we never thought of.
- **The GUI is a rendering layer.** Rendering an interface out of a
  structured capability is easy; inferring the capability back out of an
  interface is impossible.

## What it requires in practice

- **No operation that "can only be done in the UI".** If there is one, the
  work isn't finished.
- **Design the interface first, then the UI.**
  The UI is one consumer of the interface, on the same level as a script —
  not a substitute for the interface.
- The interface has to pass the checks in
  [the ergonomics](../domain-mindsets/programmatic-ergonomics.md): structured
  first, rendering as its own layer, guessable, errors that state the next
  step, idempotent, output size under control.
- **One question in review**: can an agent, given only `--help` / the types /
  the schema, get the job done with it?
- **Internal tools get the same treatment.** "It's only internal" is not a
  reason to offer only a UI — internal systems are exactly where agents are
  used the most.

## What this is not

- **It is not doing without a GUI, and it is not neglecting the human
  experience.** The GUI still has to be done well. It is just **built on top
  of the interface**.
- **It is not "everything must be a CLI".** API in the broad sense: library
  functions, HTTP interfaces, protocols, and file formats all count. Pick the
  fitting one.
- **It is not "having an API is enough".**
  A hard-to-use API only shifts the cost onto the caller.
  Programmatic-first means **that interface is itself the main product**.
