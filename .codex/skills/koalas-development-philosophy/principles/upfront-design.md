# Upfront design beats firefighting

**Easy choices, hard life; hard choices, easy life.**

The easy choice at the start — write to the request and deal with problems
when they show up — buys endless firefighting. The hard choice at the start
— stop and think the thing through — buys a smooth road afterward. So design
has to be done **thoroughly**.

## Design means the abstraction, not the structure

The design meant here is **not** drawing module diagrams, picking a tech
stack, and listing interfaces up front. Those are products of design, not
design itself. Doing them first is starting construction before you have
figured out what you are building.

There are only two things to actually do:

1. **Get clear on what this thing "is".**
   Defining a thing is exactly what the word "abstraction" means.
2. **Get clear on what it "naturally" ought to look like.**

## The most fundamental thing is cognition

Cognition and abstraction are two sides of the same thing, and they exist at
every level: the project, a module, a function, a variable (the name is
cognition made visible).
**Designing these cognitions is the most important work.**
When the cognition is designed well, everything looks natural, and **bugs
simply don't arise, because a bug is unnatural**
(see [excellence is the default](excellence-by-default.md)).

The reverse is a very useful signal: a place that can only be kept standing
by patches is usually not an implementation written wrong. The cognition
there was wrong from the start.

And the quality of a cognition depends on how complete the context is — a
definition made from a fragment is certainly a wrong definition.
See [cognition: the ability to define things](cognition.md).

## An example: a tool that generates slide decks with AI

**The shallow approach** starts from the request: design it as a workflow —
gather information, then settle the layout, then generate the content; or
design it as "emit HTML, then convert to a deck", and then pile a heap of
odd prompts into it. It runs, but every new case means another stage and
another prompt, and soon nobody dares to touch it.

**The deep approach** asks "what is it" first:

- **What are Codex and Claude Code?** Existing, general "intelligent
  executors". They are bad at slide decks not because they aren't smart
  enough, but because **they lack one convenient tool**.
- **What is a slide deck?** A set of images.

Lay the two definitions down and the thing to build surfaces by itself:
build an **image-oriented build system**, something like cmake — the AI
writes a description of "what each page looks like", and the system makes
the images; beside it, add a tool that composes several images into a
PDF/PPT. That is all.

The beauty is that it **is not a fixed pipeline**:

- Want information retrieval beforehand? Just tell the AI "search first,
  then use this system" — no change to the system.
- After it finishes, the AI can look at the images itself and adjust until
  they look good.
- **Version control comes for free**: versioning the deck reduces to
  versioning the text descriptions.
- **Incremental builds come for free**: each make rebuilds only the pages
  whose descriptions changed.
- **It transfers**: add dependency tracking (one image can reference another
  as a reference) and the same system can make comics or promotional
  material.

In this example, what matters is not thinking "how do we auto-generate slide
decks". It is thinking "what is a slide deck" and "what is Codex".
**Thinking aimed at the business is shallow; thinking aimed at "what is it"
is deep, and the deep thinking is usually the more important.**

## Development is not demand-driven. It is technology-driven

Demand-driven development inevitably ends as a pile of mud: requests are
scattered and unrelated to each other, and implementing them one by one
produces a pile of unrelated things.

A good developer has an **intuition about how a thing "ought" to be**: this
thing was always supposed to look like this. That intuition **comes before
the request, and before the so-called pain point**. It is a kind of natural
order, a way rooted in people and in the regularities of the world, a kind
of beauty, a kind of rightness. The **elegance** we talk about describes
exactly this beauty that has nothing to do with business requirements.

- Google reduced getting information to a single search box, by this beauty.
- Linus made a file in Linux into an abstract standard — one that holds not
  only files but all kinds of hardware devices — by this beauty.
- The Transformer modeled thinking as "predict the next token", by this
  beauty again.

None of the three was derived from a requirements list.

## Beauty is not rhetoric. It is "more likely to be right"

That simple, elegant, general things tend to be right has a basis:

- Philosophically, this kind of elegance is a manifestation of the nature of
  the world.
- Mathematically, it connects directly to **Solomonoff induction** — shorter
  programs have higher prior probability — and to **Kolmogorov complexity**.
  A shorter description that explains the same amount of phenomena is more
  likely to have caught the real regularity, rather than memorized a pile of
  coincidences.

So "this design isn't elegant enough" is not an aesthetic quibble. It is a
judgment about correctness: **it probably hasn't hit the essence yet.**
Conversely, when a design makes you feel "it was always supposed to be this
way", it will usually keep holding in places you didn't anticipate.

## How to use it

Before starting, answer two questions. If you can't, don't start writing:

1. **What is this thing?** (One sentence. No tautologies like "a system for
   doing…".)
2. **What should it naturally look like?**

Calibrate along the way with these signals:

- **You're stuck, piling on special cases, adding strange prompts** →
  usually not a difficulty problem; the abstraction is wrong.
- **It feels ugly** → take that feeling seriously. It often finds the
  problem earlier than any reason you can state.
- **A request is a clue, not a blueprint.** Requests tell you whether your
  guess at "what it is" is right, but they are not themselves the answer.
  Copying the request gives you a pile of mud.

Thinking it through is not indefinite daydreaming. The criterion is simple:
**can you say what this thing is in one sentence?** If you can, you can
start. If you can't, the extra half day of thinking is certainly cheaper
than the three days of firefighting later.

## What this rule is not

- **It is not big design up front (BDUF), and it is not a waterfall.**
  What has to be thought through in advance is "what it is", not locking
  down every detail and every interface ahead of time. Get the abstraction
  right and the details can grow as you build.
- **It is not a license for over-engineering.**
  The result of thinking it through should be **doing less**: an accurate
  abstraction eliminates a pile of special cases. If your "design" produces
  more layers, more extension points, and more configuration, that is not
  design. It is the first mode of decay (see [minimalism](minimalism.md)).
- **It is not ignoring requests.**
  Requests are the raw material and the test of cognition. Elegance thought
  up without looking at the requests is self-indulgence.
