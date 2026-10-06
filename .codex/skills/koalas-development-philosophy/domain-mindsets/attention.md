# Attention: let the AI notice the right thing at the right time

**The core of using AI well is not putting knowledge into the repo. It is
letting the AI notice the right thing at the right time.**

Information that sits there unnoticed is the same as information that doesn't
exist — **and worse**, because you believe it is doing its job.

## The attention chain

Everything you want the AI to notice must have a **chain of pointers leading
to it from "a place it is certain to see"**; and **every link in the chain
needs a short description, so it has a motive to keep walking.**

A typical chain:

> the always-loaded file (`AGENTS.md`) → the skill's `description` → the
> entry in `SKILL.md` → the full text of that entry → the docstring in the
> code

No layer has to say everything. **It only has to carry the person and the AI
to the next layer.**

## Two ways the chain breaks

**One: the chain is broken. The thing is in the repo, but no pointer points
at it.** A well-written design document lying deep in `docs/`, never
mentioned in the always-loaded file — then it doesn't exist.

**Two: the chain is there, but there is no motive. The pointer exists, but
the description is an abstract noun.** `cognition.md`, `utils/`, `common`,
`manager` — looking only at these names, the AI can neither guess what is
inside nor think to open them. **A pointer without a motive has the same
effect as no pointer.**

So the criterion for the description at each pointer is not "it explains what
the thing is". It is **"is it enough to make someone feel the motive to go
look at it right now"** — give concrete hooks: examples, terms,
counterexamples. This is why this repo's `SKILL.md` has to be written long.

## Attention has a budget

The starting points of the chain are few, and they are **always-on**: the
always-loaded file, the skill's `description`, directory names, file names,
function names. Every one of them is scanned in **every** collaboration, so
they are the scarcest resource in the whole repo.

From this:

- **An always-present place holds only things that are true at all times.**
  The more you pile in, the lower the probability that any one item actually
  gets noticed — **dilution is deletion**.
- **A name is a pointer.** `utils.py`, `data`, `handle()` are break points in
  the chain. A badly chosen name is not merely ugly. It makes that piece of
  the thing invisible to the AI (see
  [cognition](../principles/cognition.md)).
- **Keep a description as close as possible to the thing it describes**, and
  the chain is short, and therefore hard to break (see
  [documentation](documentation.md)).

## How to use it

- **When you want the AI to notice something, ask first: from where can it
  walk there right now?** If you can't answer, go add the pointer first,
  rather than writing the content in more detail. The practical form is in
  [everything chains back to the always-loaded file](../practices/chain-back-to-always-loaded.md)
  — among known mechanisms only `AGENTS.md` / `CLAUDE.md` are guaranteed
  always loaded, so the chain can only end at them.
- **Something you repeatedly have to remind the AI about before it notices
  means the chain is broken.** Add the pointer; don't remind it every time
  (see [explain the same thing twice and it goes into the repo](../practices/teach-once.md)).
- **Every time you add a directory or a module, give it one line saying what
  it is.** The cost of one line buys whether it will be found later.
- **Something you don't want noticed, delete it in preference to annotating
  it.** Historical leftovers and temporary scripts nobody uses were never
  supposed to stay — leave them and they will certainly be learned from (see
  [what a repo is](../principles/what-is-a-repo.md)). Things that genuinely
  must exist long-term and should not be noticed (build artifacts, vendored
  code) are separated with `.gitignore` and directory conventions, not with a
  sentence saying "don't look at this".

## What this is not

- **It is not stuffing everything into the always-loaded file.**
  That spends the attention budget all at once, and the result is that
  nothing gets noticed.
- **It is not grabbing attention by writing descriptions extravagantly.**
  Descriptions have to be accurate. One exaggeration buys one click, and
  after that every description gets discounted.
- **It does not hold only for AI.** Something a person can't find, can't
  understand, or can't remember to go look at is the same problem the AI
  faces — **the attention chain is shared by both sides.**
