---
name: koalas-development-philosophy
description: Koala's development philosophy — the general basis of judgment for design and engineering, plus mindsets for specific areas of work and concrete practices. Covers minimalism (two modes of decay — features before necessity, and building too literally; extrapolate in order to subtract, and after extrapolating there should be less code), what code is (a means and a liability; we are always in the development phase; open to both extension and modification), what a repo is (a workspace that exists for a purpose, holding the product, the production background, the means of production, and the method of production; the purpose defined at the level of cognition; only what has earned its place stays, history belongs to git), upfront design over firefighting afterward, cognition and the ability to define things, digging to the root (being stuck between two bad options usually means a design further up is wrong), excellence as the default (make the good natural and the bad unnatural; the code gradient and singularities), providing building blocks rather than features (avoid unnecessary aggregation, aggregate as a hierarchy when you must, build to use; code is part of product design, and AI and developers are first-class users), composition over configuration, beware of coupling you can't see (implicit coupling at the concept layer and the user-expectation layer), seeking truth from facts (conventions have no universal value; different purposes have different elegances), having a view (AI should not follow instructions blindly — what they said, what they want, and the real solution are often three different things; say the intuition that something is off and discuss it), giving the rationale and not just the rule; Creative Koalas' (the company's) own choices (the ordering of tradeoffs — simplicity and elegance before backward compatibility and performance; programmatic first — every capability has an elegant programmatic interface, and the interface is designed before the UI); plus product and interaction design, the three boundaries (the product / the product plus other existing things / plus the user; the first layer simple, the second powerful, the third a good experience), building tools for general agents rather than vertical agents (垂域 AI 系统) or complex workflows — a general agent beats a hand-engineered one even inside the vertical slice, because its behavior emerges and its control flow is generative, reactive, and adaptive, the way deep networks beat hand-engineered features, and engineered wisdom is almost always worse than online adaptation; but today's general agents lack creativity, so give them the right tool, the right knowledge, and the right mindsets, and the guidance (a skill) is as important as the tool, as Chameleon does, the ergonomics of programmatic use (CLI, API, and library calls all count; structured first, rendering as its own layer, make guessing right the default, an error is an instruction to the agent, output size under control), technology choice (what it ought to be comes first, make good the default, pick modern over archaic, extreme caution with Java and bare frontends), attention in AI coding (the attention chain — a chain of pointers with a description at every link), testing (restraint, prefer integration tests, guarantee correctness by design rather than by tests), documentation (descriptions of the implementation sit next to the implementation and are generated when they can be; context and design philosophy get their own volume and are maintained over time; all of it stays short), supervising agents (when one person supervises many agent sessions, the owner's understanding and judgment is the bottleneck, and unjudged work drifts — deviations get written down as "limitations" and nobody sees them; so explain top-down, first principles → the idea behind the design → the design → the implementation architecture → how to try it yourself, in the core abstraction's terms rather than the implementation's, make every decision decidable with a worked example and a default, give evidence the owner can check rather than claims, and write for a peer rather than a student), and directly executable practices (three playbooks — starting a project, a request arriving, hitting a bug; confirm a constraint is real before building a workaround; ask when information is missing; explain the reasoning while you're at it and guide people to think by asking questions; guide people to volunteer purpose and cognition-level context; before adding, say what it replaces; everything chains back to the always-loaded file; a repo needs "what this is and why" — the short version in the always-loaded file, the full text in design/; keep a living report for the owner in the repo — what changed since the last report, what needs them, where it stands, then the system from first principles to trying it yourself, updated in the same commit as the work, with numbers generated and commands run as printed, never a one-shot page, a hosted copy, or a note in memory; explain the same thing a second time and it goes into the repo; the second occurrence of the same kind of problem may not be fixed in place; what a machine can enforce, don't write as a rule; docs and tests change in the same commit as the implementation; small commits; use independent agents with engineered context to get a perspective you don't have — a clean context simulates a user or new contributor who knows nothing and shows whether the product is usable and the code understandable, and injecting a general investor mindset simulates an investor reading a business proposal; the character comes from what the agent actually knows, not from a label, and the result is evidence rather than a vote). The first time it is loaded on a machine, also check whether the user-level always-loaded file (Claude Code reads ~/.claude/CLAUDE.md, Codex reads ~/.codex/AGENTS.md) already @-imports this skill's always-loaded.md, and if not, ask once and then add it; leave a project's CLAUDE.md / AGENTS.md alone by default, and never write a machine-local path into a git-tracked file. Use it before writing code when thinking about design, making technology choices and tradeoffs, designing product shape and interaction, reviewing a feature proposal, judging whether a practice is good, deciding how big a change should be, reviewing code, writing docs or rules, committing, reporting to the person supervising the work (a status report, a final summary, a question for them to decide), or having to decide where nothing is written down.
---

# Koala's development philosophy

Design wisdom from the era of programming by hand, joined to the new
situation of the AI era. **Written for people and for AI at once**: both
sides work to the same standard.

## Three layers, organized by degree of abstraction

| Layer | What goes there |
| --- | --- |
| **General principles** (below) | The most abstract. Not limited to a language or a domain. They apply everywhere |
| Mindsets for specific areas (`domain-mindsets/`) | How to think, and how to weigh tradeoffs, for one kind of work |
| Concrete practices (`practices/`) | Conventions you can follow directly |

**The more abstract, the more important**: better to teach someone to fish
than to hand them a fish. The part a rule can enumerate is exactly the least
valuable part. Reality always runs somewhere the rule doesn't cover, and the
only thing still usable then is judgment. So the latter two layers are
corollaries of the first, and **when they conflict, the intention of the more
abstract layer wins**.

**Every item is advice, not an edict.** The reader has to read out the
problem it is trying to solve, rather than treating it as a checklist that
must be ticked. When an item conflicts with its own intention, follow the
intention, then come back and fix the item.

## Do one thing first: make this philosophy always present

A skill is **loaded on demand** (only the `name` and `description` are always
present), and things like "think it through before you start" are usually
already underway by the time you realize you should have loaded it. So the
most important items have to go into a file that is **loaded every time**.

**The judgment**: is the marker `koalas-development-philosophy` in the
context? If it is → do nothing. If it isn't → install it.

**How to install: add it to the user-level always-loaded file** — Claude Code
reads `~/.claude/CLAUDE.md`, Codex reads `~/.codex/AGENTS.md`. Add it to
whichever exists; if both are in use, add it to both, this one line:

```markdown
@<the directory this skill lives in>/always-loaded.md
```

You are reading `SKILL.md`, so you know where this directory is. Fill it in
(installed by the `skills` CLI, it is generally at
`~/.agents/skills/koalas-development-philosophy/`).
**Import it rather than pasting it**, so the content has exactly one source
of truth: after the skill updates it takes effect automatically, with no
synchronization step of any kind.

This step changes a file **outside any repo**, belonging to this machine, so
**ask once before doing it**.

### By default, don't touch a project's `AGENTS.md` / `CLAUDE.md`

They go into git. Writing an import pointing at `~/` or `/Users/…` into one
looks fine on your machine, and **for coworkers and CI it is a silently dead
`@`** — no error, the content is simply never there (see
[everything chains back to the always-loaded file](practices/chain-back-to-always-loaded.md):
writing it and not hanging it up is worse than not writing it, because you
believe it is doing its job).

**Hard rule: an `@` written into a git-tracked file must use a repo-relative
path, and must not contain `~` or `/Users/`.**

A project-level import holds in exactly one situation: **this skill's content
is actually inside that repo** (a submodule, or the copy installed by
`skills add` without `-g`). Only then does it really mean something — it
carries coworkers and CI along too. But that is **a change to the repo's
structure, which is a person's decision**: you may propose it, and do it
after getting agreement.

If you see a project file that already contains an import pointing at a
machine-local path, that is a leftover from before this rule. Delete it and
switch to the user-level installation above. A whole body of text pasted in
gets the same treatment — it diverges from upstream.

## General principles

Each one gives the claim, the reason, and enough of a hook to judge "should I
read the full text"; the argument lives in its own file.

### Minimalism

**The smallest solution that fully solves the problem is the best solution.**
A codebase decays in only two patterns: **features before necessity** (the
feature ships before the need has arrived), and **build too literally**
(stare only at what is in front of you, and patch whatever is missing). The
second is stealthier, and especially easy to hide behind minimalism — a pile
of locally minimal changes can add up to a grossly bloated whole. So even a
very specific request gets pushed one level up, to find the general and
elegant design: **extrapolate in order to subtract, not to add, and after
extrapolating there should be less code.** Writing ten thousand lines and
shipping a hundred features in a day is not skill. Doing their job with a
hundred lines and ten features is.
→ [principles/minimalism.md](principles/minimalism.md)

### What code is

Two claims to hold at once: **code is a means, not an end** — the ability is
the asset and the code is only the price, so it is a liability, and the
interest is the cost of understanding, the surface area for bugs, and the
cost of change; **code is developing, not something you write and leave** —
the era of "development done, now maintenance" is over, we are always in the
development phase, so stop being "open to extension, closed to modification"
(the OCP forces people to absorb every change by adding a layer, and what
gets added is a system nobody dares to touch) — be open to modification too.
Remembering only the first produces code that is minimal but rigid;
remembering only the second builds extension points ahead of time. Together:
**trade as little code as possible for as much modifiability as possible.**
→ [principles/what-is-code.md](principles/what-is-code.md)

### What a repo is

**A repo is not the maintenance of a software package. It is a workspace that
exists for some purpose.** It holds the purpose itself, and everything done
for that purpose: the product, the production background (context, cognition,
design philosophy), the means of production (tools, CI/CD, tests, skills,
prompts), and the method of production. This explains why design philosophy
and prompts belong in the repo, and why the monorepo exists. So **development
is the evolution of the whole workspace**, and all four are maintained and
reviewed. And **at any moment the repo holds only what has earned its place —
it is a snapshot of the present, not an archive, and history belongs to
git**: what is left behind, people can't tell whether it still counts, they
learn from it, and it spends the attention budget all the same. And the
purpose **has to be defined at the level of cognition** — "this is the client
for xxx" is a label, not a definition; flash or familiarity, a trendy AI app
or national-scale infrastructure, these are the defaults behind the dozens of
small decisions made every day, and they shape both people and AI.
→ [principles/what-is-a-repo.md](principles/what-is-a-repo.md)

### Upfront design beats firefighting

**Easy choices, hard life; hard choices, easy life.**
Design here means **the abstraction** (what this thing is, what it naturally
ought to look like), not module structure and tech stack — drawing the module
diagram and settling the stack first is starting construction before you have
figured out what you are building. So development is not demand-driven, it is
technology-driven, and demand-driven development ends as a pile of mud. A
good developer has an intuition about how a thing "ought" to be, and it comes
before the request. "Elegance" is exactly this beauty that has nothing to do
with the business, and beauty means **more likely to be right** (Solomonoff
induction: shorter programs have higher prior probability). The full text has
one complete example: thinking of "AI makes slide decks automatically" as an
image build system, which solves version control and incremental builds along
the way and can transfer to making comics.
→ [principles/upfront-design.md](principles/upfront-design.md)

### Cognition: the ability to define things

**A developer's most important ability is the ability to define things** —
from the product to a module to a variable, every level has one; sometimes
conscious, sometimes subconscious, **and most often unconscious, and those
are exactly the easiest to get wrong**. And the quality of a cognition
depends on context: **a definition made from a fragment is certainly a wrong
definition**. In a team, everyone is often like the blind men and the
elephant, holding only one point; someone who gives the AI no context makes
the AI feel the elephant too — and the AI feels fast and fluently, writing a
great pile of self-consistent but misaligned things along that one point. So
both people and AI first judge whether what they hold is the whole picture or
a fragment, go fill in what is missing, and write what they can't fill in as
an assumption.
→ [principles/cognition.md](principles/cognition.md)

### Dig to the root

**The best solution to most problems is not where the problem shows up**, but
far upstream: structure the code well and many bugs and performance problems
never get a chance to happen; design the product well and much user feedback
is never raised. So a feature request cannot be taken literally — the
**phenomenon** the user reports is real, the **solution** they propose may
not be. The most useful signal: **when a design is stuck between two bad
options, it is usually not that this spot is hard, but that some design
further up has a problem, or you haven't thought it through yet.** The
stopping criterion is "changing it here makes a whole class of problems
disappear together", not "I can still keep asking upward".
→ [principles/dig-to-the-root.md](principles/dig-to-the-root.md)

### Excellence is the default

**Great design makes the good thing natural and the bad thing unnatural.**
A bug here means everything "bad" (experience, performance, logic, structure,
readability), and it is a spectrum rather than a switch, so the goal is
**the better the practice, the less effort; the worse, the more effort**,
with the limit that the bad practice **cannot be expressed at all** (like
Newspeak in *1984*): in serverless you can't get anyone else's state, and in
Next.js the backend has exactly one definition. So a great design often needs
no exception handling — the criterion is not the quantity of exception
handling, but whether "why is this exception impossible" has a structural
answer. The measurable form is the **code gradient**: code where a small
change can break things is called a **singularity**, and it doesn't count as
good even if it is currently completely correct. **Correctness is a property
of a point; the gradient is a property of a neighborhood.**
→ [principles/excellence-by-default.md](principles/excellence-by-default.md)

### Provide building blocks, not features

**Don't aggregate capabilities into one big thing "for people to use".
Provide atomic building blocks, and let people build what they want.**
An interface with a hundred buttons, a backend with a hundred endpoints, a
class with a hundred methods, a function with a hundred parameters — the same
disease: **piling a large number of mutually independent things onto one flat
plane**. The counterintuitive conclusion: **building blocks are usually fewer
than one-stop interfaces**, because you don't have to enumerate the
combinations. When you must aggregate, **make a hierarchy** (an operating
system: system calls → shell and standard library → applications), each layer
giving its users building blocks of the right granularity — **a flat,
enormous aggregation is what is bad**. The computer itself is the exemplar:
it doesn't come with everything, it lets you get online and install apps,
**you are building your own computer**. **This draws no line between inside
and outside**: writing code, designing an API, and designing a product are
the same thing at different scales. Developers, developer-users, and AI are
essentially the same kind of user, and one design benefits all three sides.
And in the AI era, **serving ordinary users is increasingly serving
developers** — the user arrives with an agent, and what the agent uses is not
your interface but your building blocks. So **the code itself is part of the
product design**, and the programmatic usage experience sometimes matters
more than the experience at the GUI level.

→ [principles/building-blocks.md](principles/building-blocks.md)

### Composition over configuration

**The difference is coupling.** Configuration binds every user to the same
entity, the parameters explode combinatorially, and **it can only cover the
dimensions of change you thought of in advance** — large change never lands
on a pre-set axis, and then every config option becomes baggage together.
Composition is small, orthogonal parts: replacing one affects only the people
using it, and it can assemble things you didn't think of at the start
(`grep | sort | uniq` was never designed by anyone). Signals: boolean
parameters, `if (config.x)` seeping into the implementation, documentation
starting to say "when A is true and B is false…". Note that configuring
**data** (ports, keys) is fine; configuring **behavior** is what should
become composition.
→ [principles/composition-over-configuration.md](principles/composition-over-configuration.md)

### Beware of coupling you can't see

**The most dangerous coupling is not the kind that imports back and forth. It
is two things sharing a concept or an expectation that was never written
down** — it isn't in the dependency graph, grep can't find it, the type
system doesn't govern it, and the damage is silent. Three layers: **the
interface layer** (the same contract implemented twice, change one side and
the other doesn't error), **the concept layer** (one page shows "remaining
credit", another shows "credit breakdown", and whether "credit" includes what
was given free or what was reserved but not settled was never defined
anywhere), **the user-expectation layer** (operations have always been
undoable, the newest has always been at the top of a list, and one day the
same place changes its semantics — the code is entirely unrelated, the tests
are all green, and the user acts on the old habit and gets hurt). **A user's
expectation is an interface too, only it is written in no file.** The remedy:
give the shared concept one definition and a name; when changing something,
ask "who else depends on this concept", not "who imported this file".

→ [principles/hidden-coupling.md](principles/hidden-coupling.md)

### Seek truth from facts

**Code conventions have no universal value.** Good or bad depends on what
this thing is actually for. Beware of dogmatism. Every convention has a cost:
backward compatibility bloats the code, "production-grade" means complexity
and a drift toward being hard to modify, and FP/OOP/AOP are none of them
universal criteria — an internal tool needs no backward compatibility at all.
The root is still cognition: only after the purpose and the positioning are
clear is a tradeoff even discussable. Blindly pursuing conventions is
substituting someone else's answer for your own thinking. **Different
purposes have different elegances** (the elegance of an internal tool is that
it can be changed in five minutes; the elegance of infrastructure is that the
interface needs no change for ten years), and the ability to derive from the
purpose "what counts as elegant here" is itself elegance.
→ [principles/seek-truth-from-facts.md](principles/seek-truth-from-facts.md)

### Have a view

**When you receive an instruction, think "why" first, rather than doing it
directly.** **What they said is one thing, what they actually want is
another, and the real solution is a third** — executing literally means
working forever at the outermost layer, "meeting the requirement" every time
and further from the essence each time. AI has to be especially careful: its
default tendency is to comply, and it executes fast and self-consistently, so
a misalignment doesn't jam, it gets spread quickly into a great pile of code
that looks very reasonable; and people tend to take the AI's compliance as
confirmation, so nobody on either side is checking. **What AI is after is
high-quality development, not pleasing humans at every turn** — if the code
vaguely feels badly designed somewhere, or the other person seems not to have
thought something through, say it and discuss it, and don't swallow it
because you can't state an exact reason: changing it can save a large amount
of future debugging, and not changing it is still good teaching, at the cost
of one conversation. But **having a view is not acting on your own**: a
better approach has to be said out loud and agreed to. Silent substitution is
worse than blind compliance; if the other person still insists, do it their
way.
→ [principles/have-a-view.md](principles/have-a-view.md)

### Give the rationale, not just the rule

**A rule detached from its rationale stops working.** Every rule is delivered
together with the problem it is trying to solve. The text is finite and
situations are infinite, and in a case the text doesn't cover, only the
rationale can be extrapolated from. So the reader **reads the intention, not
the letter**; when an item conflicts with its own intention, follow the
intention, then come back and fix the item.
→ [principles/rationale-over-rules.md](principles/rationale-over-rules.md)

## Creative Koalas' own choices

The principles above are general. These are **Creative Koalas' own answers**,
the landing of [seeking truth from facts](principles/seek-truth-from-facts.md)
at this company.

**The simplicity and elegance of the code come before backward compatibility,
before performance, and before user experience that isn't very important.**
Robustness and production stability are not among the things that give way —
elegant code is itself more robust, and robustness piled up out of a heap of
patches is the amateur's approach. The reason: we are an AI startup, the code
changes every day, and **whether it is easy to change matters far more than
whether an interface can last ten years**; and our competitiveness is a
dimensional advantage in fundamental technology, not competing over a few
percentage points on the engineering side.
→ [company/tradeoffs.md](company/tradeoffs.md)

**Programmatic first**: for every product, internal and external, **the
primary user is a programmatic user** — someone writing a script, another
piece of code calling it, an agent doing the work for a user. Every
capability must have a programmatic interface (in the broad sense), and that
interface itself has to be elegant, building-block oriented, and ergonomic.
**No operation that "can only be done in the UI"**; design the interface
first, then the UI. The reason: users arrive carrying an agent, everyone
inside has an agent, and **an interface is composable while a UI is not**;
the GUI is a rendering layer, rendering a UI from a capability is easy, and
inferring the capability back out of a UI is impossible.
→ [company/programmatic-first.md](company/programmatic-first.md)

## Mindsets for specific areas

**Product and interaction design**: the greatest products are all general,
and "feature-rich" is not good. What is actually good is letting the user do
anything they want using a few features simple enough to need no teaching.
→ [domain-mindsets/product-design.md](domain-mindsets/product-design.md)

**Testing**: the purpose is not going wrong, so the first priority is making
the error impossible by design, not writing more tests. Write tests with
restraint (every test is a debt that has to change along with the
implementation), weigh the return against the cost, prefer high-level, and
keep them as close as possible to the code they test.
→ [domain-mindsets/testing.md](domain-mindsets/testing.md)

**Technology choice**: first ask "what ought this thing to look like", then
pick the tool. Criterion one is **pick the one that makes good the default
and makes bad uncomfortable** — something naturally stateless uses
serverless, something naturally stateful (such as persistent agent infra)
should not be forced into it; the most useful question is "am I using it with
the grain or working around it". Criterion two is **pick modern, not
archaic**: a modern stack has "make the error inexpressible" built in. There
is also an extreme-caution list (the Java family; archaic frontends like bare
HTML/JS/CSS and jQuery — Next.js, TypeScript, and Tailwind are all fine).
→ [domain-mindsets/tech-choice.md](domain-mindsets/tech-choice.md)

**The three boundaries**: designing anything for someone else to use (an app,
an internal system, a tool, a code package, a skill all count) means looking
at three layers at once: the product itself / the system formed by the
product and other existing things / the system formed once the user is added.
When usable "other things" exist, the principle is **the first layer simple
and elegant, the second powerful, the third a good experience** — trying to
be powerful and a good experience at once inside the first layer certainly
produces something bloated. The most common "other thing" today is the
general AI agent. The criterion is **whether your user will actually have
it**, not whether it can technically cooperate.
→ [domain-mindsets/three-boundaries.md](domain-mindsets/three-boundaries.md)

**Tools for general agents, not vertical agents**: most of the time, "build
an AI system" really means "build something an existing general agent can
use". A vertical agent (垂域 AI 系统) or a complex workflow is almost always
worse, **even inside that vertical slice** — a general agent's behavior
emerges, and its control flow is generative, reactive, and adaptive, where
the workflow is hand-engineered wisdom about cases you anticipated. The
analogy is deep networks against hand-engineered features: engineered wisdom
is almost always worse than online adaptation. What you build instead is the
pair around it. Today's general agents lack creativity, so **give them the
right tool, the right knowledge, and the right mindsets, and the guidance is
as important as the tool**. Chameleon is the example: a build system plus the
skill that teaches an agent to author with it, where the request was "AI
that generates images and video".
→ [domain-mindsets/tools-for-general-agents.md](domain-mindsets/tools-for-general-agents.md)

**The ergonomics of programmatic use**: the experience designed for people
who "write code to use your thing", and for AI. The user **guesses as they
write**, and **when AI guesses wrong it doesn't stop to ask — it writes wrong
code that looks very reasonable**. **"Programmatic use" is broad**: a CLI, a
network API, a library function called by another piece of code all count.
The first rule of thumb is **structure it whenever you can, and lift
rendering out as its own layer** — **the degree of structure directly
determines the degree of composability**; a blob of text can only be torn
apart with a regex. The rest: **make guessing right the default**,
guessability before completeness of documentation, every capability callable
from a script, **an error message is the real-time instruction you give the
agent**, what can be generated is the best documentation, idempotent and
retryable, output size under control (an agent can't scroll and skip). The
test: give an agent that has never read the docs a real task armed with
nothing but `--help`, and watch where it gets stuck.
→ [domain-mindsets/programmatic-ergonomics.md](domain-mindsets/programmatic-ergonomics.md)

**Attention in AI coding**: the core of using AI well is **letting it notice
the right thing at the right time**. Everything you want it to notice must
have a **chain of pointers** reaching it from "a place it is certain to see",
and every link needs a **short description** giving it a motive to walk on.
Two ways it breaks: no pointer (the thing might as well not exist), or a
pointer whose description is an abstract noun (equally nonexistent).
Attention has a budget, and **dilution is deletion**.
→ [domain-mindsets/attention.md](domain-mindsets/attention.md)

**Documentation**: **descriptions of the implementation** sit next to the
implementation, generated when they can be, with the goal of "no
documentation needed"; **descriptions of context, abstraction, and design**
should have their own directory and be maintained over time — the abstraction
is the purpose and the concrete is the means, and keeping only the means
means every update drifts a little from the purpose. Both kinds stay short.
→ [domain-mindsets/documentation.md](domain-mindsets/documentation.md)

**Supervising agents**: when agents write the code, **the scarce resource is
the owner's understanding and judgment**. One person supervising several
sessions moves only as fast as they can judge each one, and **unjudged work
drifts**: in Kit, autonomous sessions removed partial checkout, role
delegation, and the security history to fit a line budget, wrote each
removal down as a "limitation", and nobody saw it. So an agent's output is
measured by how cheaply it lets the owner judge correctly. The terminal is
the wrong home for that, being a stream ordered by time that dies with the
session. **Explain top-down** — first principles → the idea behind the
design → the design → the implementation architecture → how to try it
yourself — because a wrong first principle invalidates everything below it.
**Speak the core abstraction, not the implementation** ("aren't files
materialization of nodes?"). **Make every decision decidable**: a worked
example, the costs, a default; an uninformed yes is not a decision. **Give
evidence, not assertion**: the report is written by the party being judged,
so generated numbers, runnable commands, estimates stated before and measured
after, and deviations named as deviations. Write for a peer, not a student.
→ [domain-mindsets/supervising-agents.md](domain-mindsets/supervising-agents.md)

## Concrete practices

Conventions you can follow directly, one per file; each states its **effect
and its counter-effect**.

**Three playbooks** — paths you can walk in common situations. They share one
thread: after each pass, look back and ask **"did this make the whole simpler
or more complex"**. **Product design and development design are the same
thing**, and the criterion is the same one: elegance.

- [Starting a new project](practices/playbook-new-project.md) —
  first write down the purpose and the boundary, then find the **general
  form** of the thing, then build the smallest loop that runs end to end.
- [A request arrives](practices/playbook-request.md) —
  whether it comes from user feedback or an internal idea: **the person
  raising the request hands you a solution, not a purpose**. First separate
  the phenomenon from the solution, dig upward for the purpose, find the
  commonality, then try to satisfy it without adding code. **When comparing
  options, look at the repo's total amount of code, not the size of this
  change.**
- [Hitting a bug](practices/playbook-bug.md) —
  judge the severity first, ask "why can this state occur", and after fixing
  it ask "how do we make this whole class have no chance to occur".

**Individual conventions:**

- [First confirm the constraint is real](practices/verify-the-constraint.md) —
  before building a workaround for "X can't be done", verify it. A workaround
  is a permanent liability, and your "impression" of a platform may be
  outdated without making you feel uncertain.
- [If something is missing, ask. Don't guess](practices/ask-when-unsure.md) —
  distinguish whether what's missing is context (look it up yourself),
  cognition, or positioning (ask directly); ask carrying your guess and a
  default answer.
- [Before adding, say what it replaces](practices/replace-dont-accumulate.md) —
  coexisting capabilities of the same kind are the main source of bloat; when
  they must coexist, write down a **decidable** end condition.
- [Everything chains back to the always-loaded file](practices/chain-back-to-always-loaded.md) —
  among known mechanisms only `AGENTS.md` / `CLAUDE.md` are guaranteed always
  loaded; something that doesn't chain back has no mechanism guaranteeing it
  will be seen.
- [A repo needs "what this is, and why"](practices/context-entry-point.md) —
  the short version in the always-loaded file (so the AI carries the right
  cognition at all times), the full text in `design/`; put the context on the
  path that must be traveled, rather than asking people and agents to go fill
  it in conscientiously.
- [Keep a living report for the owner, in the repo](practices/living-report.md) —
  one page per repo for the person who judges the work. The top holds what
  changed since the last report (new, fixed, found, and over estimate), what
  needs them (each decision with a default), and where it stands (works with
  evidence, unproven, deliberately not built). Below it, the system goes from
  first principles to the idea, the design, the architecture, and copy-paste
  commands to try it. It is updated in the same commit as the work, with
  numbers written by the code that measures them and commands run exactly as
  printed. **Never a one-shot page, a hosted mirror, or a note in memory**: a
  copy drifts and is still trusted.
- [Explain the reasoning while you're at it](practices/teach-and-guide.md) —
  explain the reasoning of this particular decision, not the principle in
  general; guide cognitive questions with questions, don't hand over the
  conclusion; and gradually turn people into ones who **volunteer the purpose
  and the positioning**, rather than only raising mechanical requests.
- [Explain the same thing to an agent a second time, and write it into the repo](practices/teach-once.md) —
  prompts and skills are means of production, not chat logs; but they go
  stale, and have to be deleted along the way.
- [The second time the same kind of problem appears, fixing it in place is no longer allowed](practices/second-occurrence.md) —
  "the second time" is a cheap and unambiguous braking point; "the same kind"
  is counted by root cause, not by phenomenon.
- [What a machine can enforce, don't write as a rule](practices/machine-over-rules.md) —
  types > lint/CI > templates > directory structure > writing a rule; a
  "careful" in a comment is the weakest guardrail.
- [Change the docs, the tests, and the implementation in the same commit](practices/co-located-changes.md) —
  make a stale description "impossible not to see".
- [Small commits](practices/small-commits.md) — one commit does one thing.
- [Use independent agents with engineered context](practices/engineered-context.md) —
  when you need a perspective you don't have, spin up a fresh agent and
  decide the character by what it actually knows. A clean context is a user
  or a new contributor who knows nothing, and shows whether the product can
  be used and the code understood; injecting a general investor mindset is an
  investor reading the business proposal. The result is evidence, not a vote,
  and a label stuck on an agent that already knows everything is role-play.
