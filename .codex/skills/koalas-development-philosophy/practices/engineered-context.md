# Use independent agents with engineered context

**When you need a perspective you don't have, don't ask the agent that has
been working with you. Spin up an independent one and engineer its context so
that it is the character you want.**

An agent that sat through the whole discussion already knows the design, the
doubts, and the defense. Ask it whether the thing is understandable and it
answers as you, because it fills the gaps from everything it has seen. A
fresh agent sees only what you put in front of it, so **what you put in front
of it is the character**.

## How to do it

**Decide the character by deciding what it knows, not by naming it.**
Sticking a "beginner" label on an agent that inherited the whole discussion
produces an agent that role-plays ignorance. The ignorance has to be real:
it comes from the context actually being empty of the things that character
would not have.

What you choose, per character:

- **The task** — the one that character would actually be handed.
- **Prior knowledge** — what they already know how to do.
- **Visible material** — only what they would actually encounter: the repo, a
  README, a proposal, a `--help`.
- **Tools and permissions** — matched to the task, with trial operations in
  an isolated environment.

And what you keep out: the expected answer, the problem you suspect, the
defense of the design, and the history of how it got this way. Leaking any of
those turns the exercise back into asking yourself.

A few characters that earn their place:

- **A user or a new contributor who knows nothing.** Clean context, given
  only the entry point they would actually meet. Watch whether the product
  can be used and whether the code can be understood. This is the case
  [product and interaction design](../domain-mindsets/product-design.md)
  walks through.
- **A general investor.** Inject a general investor's way of reading — what
  return, what risk, what has to be believed — and hand them the business
  proposal and nothing else.
- **Whoever the question is actually about.** A first-time user, a beta
  tester, an administrator, a maintainer, someone coming back with old
  habits. The character follows from the question, and the list is not fixed.

Then watch what they do before you ask what they think. Where they look
first, where they get stuck, and what they conclude are the evidence. A
sentence of "this is great" is the least useful thing they can produce.

## Effect

The person who designed a thing is the worst judge of whether someone else
can understand it, and an agent that shared the design session has the same
blindness. An independent agent with the right context is a way to get that
judgment without waiting for the real person — and to get it again after a
fix, cheaply.

## Counter-effects and boundaries

- **The output is evidence, not a vote, and it does not replace the real
  person.** A simulated investor is not an investor. Whether to change, and
  how, is still judged by the purpose.
- **A character built from a stereotype just reproduces the stereotype.**
  "Inject a general investor mindset" means the general way an investor
  reads, not a caricature. The more specific knowledge you invent for them,
  the more the result is your own assumption spoken back to you.
- **Independence is load-bearing.** Resuming the agent that did the work, or
  pasting the discussion in "for background", destroys the point. If the
  context can't be made clean, don't run the exercise.
- **It costs a run, so spend it where your own context is the obstacle**:
  whether a newcomer can use it, whether a newcomer can read it, whether the
  proposal survives a reader who doesn't share your beliefs. Fact questions
  don't need a character.

From [cognition](../principles/cognition.md): a definition made from a
fragment is a wrong definition, and the fragment someone holds is exactly
their context. This is that fact used on purpose — choose the fragment, and
you choose the judgment you get.
