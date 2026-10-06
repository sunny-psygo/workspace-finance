# Provide building blocks, not features

**Don't aggregate capabilities into one big thing "for people to use".
Provide a set of atomic, abstract building blocks, and let the user build
what they want out of them — build to use.**

**This draws no line between inside and outside, and none between levels.**
It is at once:

- **A way of writing code**: don't build a class with a hundred methods;
  build a set of small orthogonal things.
- **A way of designing an API**: don't publish a one-stop interface; publish
  composable atomic capabilities.
- **A way of designing a product**: don't pile on features; give a few
  general capabilities that combine freely.

These three are not analogies. They are the same thing at different scales.

## Avoid unnecessary aggregation

The same disease has many faces:

- an interface with a hundred buttons
- a backend with a hundred interfaces and no organization
- a class with a hundred methods
- a function with a hundred arguments

All of them **pile a large number of mutually independent things onto one
flat plane**. What is wrong with that:

- **The cognitive cost is shifted onto the user.** Before doing the thing,
  they first have to solve a new problem: which one is this done with?
- **The number of units explodes.** A "one-stop" interface has to cover
  **every combination**; building blocks only have to cover **the
  dimensions**.
- **You will always miss some combination**, so you add another one-stop
  interface — and then there is no end.

One counterintuitive but crucial conclusion:

> **The number of building blocks is usually smaller than the number of
> one-stop interfaces**, because you don't have to enumerate the
> combinations.

This is the Kolmogorov point in
[upfront design beats firefighting](upfront-design.md): the shorter
description that generates the same amount of phenomena is usually also the
more correct one.

## When you must aggregate, make a hierarchy, not a flat plane

"Give building blocks" does not mean "throw the lowest level at the user as-is
and let them assemble everything" — that is a different failure.

Look at an operating system:

- **The bottom**: file descriptors, system calls
- **The middle**: shell commands, standard libraries of various languages
- **The top**: APIs, applications

**Each layer provides building blocks of the right granularity for its
intended users.** Hierarchical aggregation is good; **a single flat,
enormous aggregation is what is bad.**

So the question was never "should this be wrapped". It is **"how big a
building block does the user of this layer need"**.

## Build to use

Rather than making an application "for people to use", or a backend "for an
AI to call", give a set of capabilities that combine freely and let the user
**build** what they want.

**The computer itself is excellent product design**: it does not come with
everything you need. What it gives you is the ability to get on the internet
and install applications — **you are building the computer that belongs to
you**.

This is the same thing as "the greatest products are all general" in
[product and interaction design](../domain-mindsets/product-design.md):
Google gives you not a hundred category directories but one search box that
can lead anywhere.

## Three kinds of user, one design

Developers, developer-users, and AI are essentially the same kind of person:

- **A developer** is a **user** of the code they call.
- **A developer-user** is a **developer** of the system they assemble from
  your building blocks.
- And both sides can now be **AI**: an agent benefits from good building
  blocks when it writes a system, and it benefits the same way when it
  finishes a task by writing scripts and running commands.

**One design philosophy, and all three kinds of user benefit together.**

## The AI era: serving ordinary users is increasingly serving developers

The division used to be clear: product design owned the side "for people to
see and click", and code was an implementation detail.
**That boundary is disappearing.**

Because ordinary users have started arriving with an agent, and **what the
agent uses is not your interface, it is your building blocks** — it reads
your interfaces, writes scripts, and composes commands, and gets the thing
done for the user. You think you are serving ordinary users; in fact you are
increasingly serving developers.

So:

> **Code — especially the building blocks that can be used from outside — is
> no longer merely an implementation detail. It is itself part of the product
> design.**

From this, the **programmatic usage experience**, and its ergonomics
(**programmatic usage ergonomics**), **sometimes matter more than the
experience at the GUI level**: the latter decides whether one person clicks
smoothly, the former decides whether an agent can get the thing done for a
thousand people.

**AI and developers are first-class users, not secondary users.**
Whether an interface is pleasant to use, whether a script can compose it,
whether errors speak plainly, whether you can guess it right without reading
the docs — these are product questions, not engineering details.
See [the ergonomics of programmatic use](../domain-mindsets/programmatic-ergonomics.md).

## Relation to the other principles

- [Composition over configuration](composition-over-configuration.md) is the
  special case of this one along the single axis of **"how to accommodate
  change"**: that one is about parameters versus parts, this one is about
  aggregation versus building blocks.
- The two sit side by side, rather than being merged into one piece, and
  that is itself a practice of this rule: **a hierarchy, rather than
  everything piled on one flat plane.**

## What this rule is not

- **It is not a refusal to provide high-level wrappers.**
  A high-level wrapper should itself be **built out of the building blocks**,
  and it should be **bypassable** — PyTorch gives the building blocks, and
  higher-level things like Lightning and Flax are built on top by the
  community. That is how the line is drawn for what a framework should and
  shouldn't provide.
- **It is not splitting things as finely as possible.**
  Building blocks should be **orthogonal and each complete in itself**.
  Splitting out a pile of fragments that depend on each other and mean
  nothing alone only moves the complexity from the interface into the call
  relationships.
- **It is not ignoring the user's level.**
  The granularity of this layer's building blocks is decided by **the user of
  this layer**, not by what is convenient for your implementation.
