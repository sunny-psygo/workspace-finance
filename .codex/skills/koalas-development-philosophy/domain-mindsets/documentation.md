# Documentation

**Documentation has exactly one purpose: to make the reader understand — how
to use it, how it works, how to change it, and why it is this way.**
Documentation has no value in itself. It is only the means of reaching
understanding.

## First distinguish: what are you describing

Documentation comes in two kinds, **divided by what it describes**, and the
two are handled in almost opposite ways:

| It describes | Where it goes | Why |
| --- | --- | --- |
| **The implementation**: what this function does, how this package is used | Next to the implementation; generated if it can be | The closer it is, the harder it is to diverge from the implementation |
| **Context and design**: background, abstraction and cognition, why it was designed this way | Its own directory, maintained over time | It doesn't correspond to the implementation's structure in the first place, and it can't be read out of the code |

Forcing the second kind into a docstring, and spreading the first kind out
into a parallel API document, are the same mistake in two directions.

## Descriptions of the implementation: the closer the better

The goal for this kind is:

> **The best documentation is no documentation.**

If the code is clear enough and the structure good enough that anyone can
find the piece they should read and know what to do after reading it, then
this kind of documentation is superfluous. Reality is of course not that
simple, which is why we write it — but **the direction is always toward "not
needed", never toward "more complete".**

Modern development is visibly moving toward **self-documenting code**
(docstrings, Rust's documentation system derived from docstrings), and they
solve the same fundamental problem:

> **Put the description as close as possible to the implementation, so the
> two are hard to diverge (documentation drift).**

"Forgot to update the docs" after changing the code is the normal case. But
it is hard to finish changing a function and fail to see the three lines of
docstring right next to it. This is a fine example of
[excellence is the default](../principles/excellence-by-default.md): not
asking people to be more conscientious, but **making "the docs follow the
code" the path of least effort**.

So: **a description should be constrained to the position closest to the
thing it describes.**

- Package-level usage notes → `__init__.py`
- A function's behavior, parameters, and boundaries → the docstring
- Why some piece of code is written this way → right beside that piece of
  code

The benefit is **traceability**: when something changes, looking up the tree
tells you which descriptions are affected and which few places to change. A
standalone API document gives you no such clue.
**The last thing you want is a standalone API document plus a careless
developer who changes the implementation without updating it** — and that
almost inevitably happens.

### If it can be generated, generate it

This doesn't mean the user always has to read the source. There can of course
be a friendlier form — **but that documentation should be generated, not
handwritten.**

- `cargo doc`: the docs are derived automatically from docstrings.
- FastAPI + pydantic: the API schema, the documentation pages, and the
  interactive playground are all generated automatically.

**If it can be generated, generate it**, and when choosing technology,
actively look for the tools and frameworks that can do exactly this. Writing
by hand a document that exists in parallel with the code is giving yourself a
synchronization obligation you have to keep paying forever —
[code is a liability](../principles/what-is-code.md), and documentation is
too.

## Descriptions of the abstraction and the design: every project should have them

**The abstract thing is the purpose; the concrete thing is the means.**

If a project keeps only the means and never records the purpose, then every
update to the means drifts a little away from the purpose. Accumulated, the
code still runs, but what it solves is no longer the problem it was
originally meant to solve. So **every project should maintain the abstract
things behind the implementation** — this is not something you do only when
you have spare capacity.

This kind **cannot be read out of the code**:

- What this system actually **is** (see
  [cognition: the ability to define things](../principles/cognition.md))
- Why this abstraction was chosen, which ones were rejected at the time, and
  why they were rejected
- Which constraints are real, and which are only historical leftovers
- Where the boundary is: what does **not** belong to this system

And it naturally doesn't correspond to the implementation's structure — one
idea is scattered across five modules, and it fits in none of their
docstrings. So it should have its own directory, **and it has to be
maintained just like the code**, not written once and locked in a drawer.

**Note that "the best documentation is no documentation" does not apply to
this kind.** However clear the code is, it can only tell you what it is like
now. It can never tell you **why it should be this way**, or **what it was
meant to become**.

## The rest that genuinely needs standalone documentation

- **Tutorials and getting-started guides.** What they explain is "how to
  accomplish one thing", which belongs to no single function. But be clear:
  **the existence of a tutorial is a compromise, not an achievement** — the
  better the design, the less there is to teach (see
  [product and interaction design](product-design.md): if it needs a manual
  before it can be used, the design isn't finished). So a tutorial should get
  thinner as the design gets better, not thicker as it gets written.
- **Things that have already become convention**, such as the `README.md`
  every project should have.

## Whichever kind, keep it short

**All documentation should be as concise, clear, and short as possible.** The
criterion:

> **Given that a newcomer can understand it fairly easily, push the length
> down as far as possible.**

Both ends are constrained: shortness alone produces something unreadable,
completeness alone produces a long piece nobody reads. The point between them
is the target.

**Length is also a physical for the design.** If a piece of code needs a very
complicated description before it can be explained, the odds are that the
documentation isn't badly written — **the abstraction is designed wrong**
(see [cognition: the ability to define things](../principles/cognition.md)).
The right response then is to go back and change the design, not to write the
explanation in more detail. By the same reasoning, a product that needs a
long tutorial has a problem in the product, not in the tutorial.

**Stale documentation is worse than no documentation** — it isn't a blank, it
is active misdirection, and it looks authoritative. So keep the volume down
to what you can actually maintain. This is the direct corollary of
[minimalism](../principles/minimalism.md) applied to prose:

- Don't write sections nobody will use, and don't write paragraphs that exist
  "for completeness".
- Say each thing in exactly one place; everywhere else, link to it, don't
  restate it — the restated copy will eventually go stale.
- A rule nobody will check and nobody will follow is the same as no rule.
  Deleting it is more honest than keeping it.
- Every step in a process has to be able to say what it blocks. A step that
  blocks nothing is ceremony.
- Examples beat enumeration: two examples that make it clear are more useful
  than a list of twenty edge cases.
