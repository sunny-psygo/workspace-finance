# The three boundaries: product, system, user

When designing anything **for someone else to use**, look at three boundaries
at once:

1. **The product** itself.
2. The system formed by **the product + other things that already exist**.
3. The system formed by **the product + the other things + the user**.

"Product" here is broad: an external application, an internal system, a tool,
a code package, a skill, even a header file — **anything given to someone
else to use counts**.

When there are usable "other things", the design principle becomes:

> **Make the first layer simple and elegant, make the second layer powerful,
> and make the third layer a good experience.**

These three sentences don't fight, because they are about three different
boundaries. **Trying to be powerful and a good experience at the same time
inside the first layer will certainly produce something bloated.**

## The most common "other thing" today: the general AI agent

General agents like Claude Code and Codex already read files, write code, run
commands, call interfaces, look at the result, and change it.
**None of that needs to be rebuilt inside the product.**

## An example: a tool that generates slide decks with AI

**Looking only at the first layer**, it is easy to build a bloated "AI slide
deck system": a built-in workflow, a layout engine, a great pile of prompts,
and one more branch for every new case.

**Seeing all three layers**, the things to build become two:

1. **A foundational tool for doing image-generation projects at scale** (the
   first layer, small and clean).
2. **A skill that teaches "how to make a slide deck well"** (best practices).

The user brings a general agent and puts the two together — the second layer
is powerful, the third layer is a good experience. And while building the
first thing, you can go one step further and think of **make** as an "other
thing": incremental builds and dependency tracking don't have to be built by
you (the full derivation of this example is in
[upfront design beats firefighting](../principles/upfront-design.md)).

## This is the same thing as "don't reinvent the wheel"

"If there's a library, use the library" is usually taken as advice at the
**implementation** level. It holds equally at the **product design** level —
the "wheel" at the product level is the things your user already has in hand:
a general agent, make, git, the browser, the operating system.

The only difference: reuse at the implementation level reuses code; reuse at
the product level reuses **capabilities the user already has**.

## The real constraint: which "other things" are reachable

This step cannot be guessed. It depends on **what your users actually have,
and what they are willing to install**:

- **A quick-witted user**: a general agent counts as reachable; even if they
  don't have one yet, you can guide them to install one.
- **An ordinary user**: getting them to use git or GitHub is already hard —
  so those don't count as reachable.
- **Inside the company**: every wheel you can find is usable. We already have
  a strong engineering culture, and everyone has a general AI agent, so the
  thinking can be opened up further.

**The criterion is not "can it technically cooperate". It is "will your user
actually have it".**

## The root is still cognition and purpose

**The product is the means. The thing to be accomplished through the product
is the purpose. Hold the purpose, not the means.**

Staring only at the first layer is treating the means as the purpose — so you
keep adding features to the means, and each addition takes you further away
(see [cognition](../principles/cognition.md) and
[dig to the root](../principles/dig-to-the-root.md)).

## What this is not

- **It is not pushing the work onto the user.**
  The experience of the third layer is still your responsibility: putting the
  pieces together has to be smooth, and there has to be guidance — one
  command that installs it, a skill to go with it, a template to start from,
  all of that is your work.
- **It is not assuming the user has everything.**
  Reachability has to be assessed honestly. Assess it wrong and what you
  build is something only a few people can use.
- **It is not skipping the product itself.**
  The first layer still has to be good — only it should be **small and
  sharp**, not **big and complete**.
