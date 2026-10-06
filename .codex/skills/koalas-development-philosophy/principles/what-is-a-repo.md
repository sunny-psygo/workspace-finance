# What a repo is

**A repo is not the maintenance of a software package — that reading is too
small. A repo is a workspace that exists for some purpose.**

What it stores is not "the product" in the narrow sense. It stores **the
purpose itself, and everything done for that purpose**.

## A repo holds four things

| | What it is | Examples |
| --- | --- | --- |
| **The product** | Product code in the narrow sense | Apps, libraries, services |
| **The production background** | Why we do it, and what it actually is | Context, cognition, design philosophy |
| **The means of production** | The structure needed to produce the product | Tooling, CI/CD, test code, agent skills, AI prompts |
| **The method of production** | How the work is done, at the level of cognition and philosophy | Development philosophy, skills, philosophy-level docs |

This explains a lot of things that otherwise look messy: why a repo holds
design philosophy, background, CI/CD, skills, and prompts. None of them is
"the product", and all of them serve the same purpose.
It also explains why the monorepo pattern was invented:
**things under the same purpose were never supposed to be split apart by
hand.**

## The purpose has to be defined at the level of cognition

**"This is the client for xxx" is not a definition. It is a label.** It
guides no concrete decision.

The purpose needs a definition at the **level of cognition** — write the
design philosophy and the product philosophy into it
(see [cognition: the ability to define things](cognition.md)). That means
answering questions like these:

- For a client: do you want it to give the user a sense of **flash**, or a
  sense of **familiarity**?
- Is its position a **trendy AI app**, or **national-scale infrastructure**
  like WeChat?
- For a tool: is it a **complete system that is itself intelligent**, or a
  tool that **borrows the intelligence of Codex / Claude Code and only does
  the mechanical work itself**?

These answers sound vague, but they are **the defaults behind the dozens of
small decisions made every day**: whether to add an animation, how to word
an error, whether to implement a capability yourself or hand it upstream,
whether to cover an edge case.

**They quietly shape the mindset of the people developing it — humans and
AI alike** — and from there the behavior of the code, and from there the
experience the user ends up with, which finally shows up as how much
dissatisfaction comes back and how fast the system runs.
Without this layer of definition, everyone applies their own defaults, and
the product grows into something that is neither one thing nor the other
without anyone noticing.

**This matters even more for AI.** An agent that never received this layer
of cognition falls back on "the most common way of writing it" — and the
most common way is almost certainly not the one you want.

What makes a definition count:

- **It has to be able to reject a proposal.** A sentence that cannot overturn
  a single PR or a single design is a nice phrase, not a definition.
- **Prefer contrasts over adjectives.** A contrast like "flash vs.
  familiarity" is ten thousand times more useful than "an excellent user
  experience".
- **Write down what it is not.** The boundary usually carries more
  information than the positive description.

## Development is the evolution of the whole workspace

**Development is far more than developing the product.**
The product, the production background, the means of production, and the
method of production are all developing
(see [what code is](what-is-code.md): everything is developing; there is no
such thing as "done").

So:

- **All four go into version control, all four are maintained, all four are
  reviewed.** A broken prompt or skill causes damage just like broken code,
  and it is harder to notice.
- **The purpose and its cognitive definition have to be maintained.** Keep
  only the means and drop the purpose, and the workspace slowly forgets why
  it exists (see [documentation](../domain-mindsets/documentation.md): the
  abstraction is the purpose, the concrete is the means).
- **Whether something belongs in this repo is "does it serve this purpose",
  not "does it count as product code".**

## At any moment, the repo holds only what has earned its place

**The repo is a snapshot of the present, not an archive. History belongs to
git.**

Git already keeps every version in full, and any of them can be retrieved at
any time. So "leave it for now, in case we need it later" is not insurance
at all. It shifts the cost onto every person and agent who reads the repo
afterward:

- They first have to judge whether the thing **still counts** — and often
  they cannot tell.
- They will **learn from it**. That is how old ways of writing reproduce,
  and AI takes them in wholesale.
- It still shows up in search results and in the AI's context, **spending
  the attention budget** (see [attention in AI coding](../domain-mindsets/attention.md)).

The criterion is still the same one: **does it serve this repo's purpose
right now?** If it doesn't, delete it.

**Deleting is not losing it** — `git log` and `git revert` can bring it back
any time. The cost of deletion is nearly zero; the cost of keeping it is
paid every day.

Things that genuinely have to exist long-term but should not be noticed
(build artifacts, vendored third-party code) are excluded by a **mechanism**:
`.gitignore`, a separate directory, staying out of the repository — not by
leaving them there with a note that says "don't look at this".

## How to use it

- **First be able to say what this repo's purpose is**, and say it at the
  level of cognition. If all you can say is a label, it is still just a pile
  of files.
- **The means of production are worth investing in.** Time spent making the
  tools, CI, skills, and prompts smooth pays back across every later round
  of development — one of the best bargains in
  [getting more from less](minimalism.md).
- **Draw repo boundaries by purpose, not by tech stack.**
  Things with the same purpose live together (even in different languages);
  things with different purposes stay apart (even on the same stack).

## What this rule is not

**It is not "stuff everything in".**
The criterion is whether it serves this purpose, not "it doesn't hurt to
leave it lying around" — [minimalism](minimalism.md) applies here too: a
thing that serves no purpose, once inside the repo, becomes noise everyone
has to route around.
