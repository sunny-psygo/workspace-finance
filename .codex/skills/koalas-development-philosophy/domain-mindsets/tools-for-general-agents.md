# Build tools for general agents, not vertical agents

**Most of the time, when you set out to build "an AI system" or "an AI
product", what you actually want to build is something for an existing
general agent to use.**

The rule of thumb:

> **A vertical agent (垂域 AI 系统) or a complex workflow is almost always
> worse than a general agent that keeps assessing the situation and acting on
> its own.**

So what you usually want is a better tool for a general lifeform — the same
shape as a tool for a human — and not a custom lifeform.

## Why

The reason is not only that the general agent already exists and rebuilding
it wastes effort. **A general agent is better even inside the vertical
slice.** The analogy is deep neural networks against hand-engineered machine
learning. A general agent emerges its own behavior: the instructions
themselves are generative, and the control flow is generative, reactive, and
adaptive. A vertical agent or a workflow is hand-engineered wisdom — stages,
branches, and rules you wrote down in advance for situations you anticipated.
**Engineered wisdom is almost always worse than online adaptation.** The next
situation is never quite the one you wrote the branch for, and the workflow
does the wrong thing with confidence while the general agent looks at what is
actually in front of it and responds.

This is the same bet [upfront design](../principles/upfront-design.md) already
makes with Solomonoff induction: the shorter, more general description beats
the one that memorized the cases. A fixed workflow is that memorized list.

So the conclusion of
[the three boundaries](three-boundaries.md) gets sharper. The general agent
is not merely an "other thing" you decline to duplicate. It is the better
implementation of the intelligence, and what your product should contribute
is everything around it.

And it is [provide building blocks, not features](../principles/building-blocks.md)
one level up. A workflow enumerates the combinations you could think of.
**The workflow is the one-stop interface; the tool is the building block.**

## What you build instead: the tool and the guidance

A general agent today still lacks creativity. Left alone with a vague goal it
does something plausible and mediocre, and it will not invent the domain's
taste, its pitfalls, or its way of working. So declining to build a vertical
agent is not the same as building nothing.

**Give it the right tool, the right knowledge, and the right mindsets.** The
tool is the capability it cannot have on its own — the thing that remembers,
computes, checks, or reaches the world. The guidance is how to wield it and
how to judge the result: skills, design philosophy, the "what this is and
why" of the domain. **The guidance is as important as the tool.** A tool
without guidance gets used literally, at the first idea the agent has. Given
both, the agent supplies the adaptive control flow and the two of them supply
everything it cannot generate. That combination works like a charm.

This is why a skill is a deliverable and not a note. It is half the product,
and it belongs in the repo beside the tool, maintained like code
([what a repo is](../principles/what-is-a-repo.md): skills and prompts are
means of production).

## What this looks like

Chameleon (`chameleon-build`) is an incremental build
system for expensive, nondeterministic artifacts: recipes form a dependency
graph, `cm` builds what is missing, and every take is kept because the
generator costs money and will not produce the same result twice. Image,
video, and image-PDF are plugins on that one engine, and an agent skill
teaches an agent how to author with it.

The request it answers is the classic "AI product" request: generate images,
video, manga, anime. Built as a vertical agent it would have been a planner
with stages — gather references, write prompts, call a model, retry, assemble
— and a new branch for every kind of artifact, each branch a piece of
engineered wisdom about a situation someone predicted. Even restricted to
that one domain, the general agent does better, because it re-derives the
control flow from the page in front of it.

What got built instead is the pair. Chameleon is the tool: the one thing the
agent cannot do, which is remembering which result belonged to which inputs
and never losing a result that was paid for. The skill that ships beside it
is the guidance: how to author, how to inspect, how to recover. Adding video
did not add a workflow. It added an artifact type that honors the same
contract, and guidance for it.

## How to tell which one you are building

- **Does it decide what to do next?** If the product contains the loop of
  "look at the situation, pick the next action", that loop already exists in
  the general agent. What remains after you delete it is the tool.
- **Does a new case mean a new stage?** A workflow grows a branch per case. A
  tool grows nothing, because the agent reads the new case itself.
- **Could a person drive it by hand?** A good tool for an agent is a good
  tool for a person. If only the workflow can operate it, the capability is
  trapped inside the lifeform you built.

## What this is not

- **It is not "never build anything agent-shaped".** Sometimes the general
  agent genuinely cannot reach your user, or the domain has a constraint the
  general agent will not respect on its own. That conclusion has to survive
  [the reachability check](three-boundaries.md): will your user actually have
  a general agent? Inside this company the answer is yes, so the bar is high.
- **It is not building half a tool and calling the agent the other half.**
  The tool still has to be good — small, sharp, and
  [ergonomic to drive programmatically](programmatic-ergonomics.md). Handing
  an agent a pile of unnamed scripts is not this rule; it is the rule with
  the work skipped.
- **It is not "the agent will figure the domain out".** The control flow is
  the part to leave generative. The knowledge and the judgment are the part
  to write down and hand over. Shipping the tool without the guidance expects
  creativity the agent does not have.
- **It is not a judgment about models.** "General" here means an agent that
  assesses and acts across whatever it is given. "Vertical" means a system
  whose scope, stages, and branches were fixed by you in advance.
