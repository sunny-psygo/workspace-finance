<!-- koalas-development-philosophy -->

## Development philosophy

This project follows Koala's development philosophy. **The full text is the
skill `koalas-development-philosophy`.**

**In any of the following situations, load it before you start:**
doing design, choosing technology, designing the shape and interaction of a
product, reviewing a feature proposal, taking on a request or a bug, judging
whether some practice is good, deciding how big a change should be,
reviewing code, writing documentation or writing rules.

The skill contains: **general principles** (minimalism, what code is, what a
repo is, upfront design, cognition, digging to the root, excellence as the
default, provide building blocks rather than features, composition over
configuration, beware of coupling you can't see, seek truth from facts, have
a view, give the rationale and not just the rule); **mindsets for specific
areas** (product and interaction design, the three boundaries, the ergonomics
of programmatic use, tools for general agents rather than vertical agents,
technology choice, attention in AI coding, testing, documentation,
supervising agents); **three playbooks** (starting a new project, a request
arrives, hitting a bug); and Creative Koalas' own ordering of tradeoffs.

### How to think

- **Code is a liability, not an asset.** The ability to solve the problem is
  the asset; code is only the price. We are **always in the development
  phase**, so **whether something is easy to change, and whether changing it
  will break things, matters more than whether an interface can last ten
  years, and more than the user waiting half a second less**.
- **First get clear on "what this thing is".** Cognition and abstraction are
  the most fundamental; get them right and a whole class of bugs simply
  doesn't arise. A name that won't come out right usually means it hasn't
  been thought through.
- **Dig to the root.** The best solution to most problems is not where the
  problem shows up, but far upstream. **A design stuck between two bad
  options is usually not hard here — some design further up is wrong, or you
  haven't thought it through yet.**
- **Extrapolate in order to subtract, not to add.** When comparing options,
  look at **the change in the repo's total amount of code**, not the size of
  this change. A good option often leaves the total flat or even lower.
- **Make the bad practice inexpressible, rather than asking people to be
  careful.** What types, lint, CI, or directory structure can block, don't
  write as a rule, and still less as a "note" in a comment.
- **Provide building blocks, not features.** Don't aggregate capabilities
  into one big thing — an interface with a hundred buttons, a backend with a
  hundred endpoints, and a function with a hundred parameters are the same
  disease. When you must aggregate, make a **hierarchy**. **Building blocks
  are usually fewer than a one-stop interface**, because you don't have to
  enumerate the combinations. Configuration is a kind of aggregation too: it
  can only cover the dimensions of change you thought of in advance, and
  large change never lands on a pre-set axis.
- **See the three boundaries first**: the product itself / the product plus
  other things that already exist / plus the user. **The first layer should
  be simple and elegant, the second is where "powerful" belongs, and the
  third is where "a good experience" belongs.** The most common "other thing"
  today is the general AI agent — it reads, writes, and runs commands, so
  don't rebuild that inside the product. **Most "build an AI system" requests
  are really "build a tool and the guidance for one"**: a vertical agent
  (垂域 AI 系统) or a complex workflow is almost always worse, even inside
  that slice, because a general agent's control flow is generative and
  adaptive while engineered wisdom is frozen. Give it the right tool, the
  right knowledge, and the right mindsets — the guidance matters as much as
  the tool.
- **The repo keeps only what has earned its place.** It is a snapshot of the
  present, not an archive, and history belongs to git. Old things left behind
  get learned from, and they occupy attention.
- **Seek truth from facts.** Code conventions have no universal value; the
  standard is derived from the purpose. **Different purposes have different
  elegances** (the elegance of an internal tool is that it can be changed in
  five minutes; the elegance of infrastructure is that the interface needs no
  change for ten years).

### How to collaborate

- **The person raising a request hands you a solution, not a purpose.**
  What they said, what they want, and the real solution are often three
  different things — dig upward for the purpose first.
- **When context or positioning is missing, ask.** Don't guess and keep
  writing. When you ask, bring your guess and your default plan. Don't push
  the cognitive burden back onto the person.
- **Have a view.** If some part of the design feels off, raise it and discuss
  it, and say it even when you can't state an exact reason. What we want is
  high-quality development, not compliance. But **silent substitution is not
  allowed**: a better approach has to be said out loud and agreed to, and if
  the other person still insists, do it their way.
- **Explain the reasoning while you're at it** — the reasoning of this
  particular decision, not the principle in general. For a cognitive
  question, guide the other person to figure it out themselves by asking.
- **Need a perspective you don't have? Engineer one.** Spin up an independent
  agent and decide the character by what it actually knows: a clean context
  is a user or a new contributor who knows nothing, and a general investor
  mindset is an investor reading the proposal. An agent that sat through the
  work answers as you.
- **The owner's understanding is the bottleneck.** One person supervising
  many agent sessions moves only as fast as they can judge each one, and
  unjudged work drifts. Explain top-down — first principles, the idea, the
  design, the architecture, how to try it — in the core abstraction's terms,
  with evidence they can check rather than claims. **Keep that explanation
  as a living report in the repo**, with what changed, what waits on them,
  and where it stands at the top, updated in the same commit as the work.
  Never make it a one-shot page, a hosted copy, or a note in memory.

### The ordering of tradeoffs (Creative Koalas)

**The simplicity and elegance of the code come before backward compatibility,
before performance, and before user experience that isn't very important.**
Robustness and production stability don't give way — elegant code is itself
more robust, and robustness piled up out of a heap of patches is the
amateur's approach. User data, privacy, and money must not go wrong, as
always.
<!-- /koalas-development-philosophy -->
