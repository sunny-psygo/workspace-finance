# Playbook: a request arrives

A request may come from user feedback, an internal idea, or a production
problem — **for you they are all the same**, because the person raising the
request has usually already translated it into a solution, and **that
translation is where the chain loses the most information**.

So the first thing is always to translate it back.

## Steps

1. **Separate the "phenomenon" from the "solution".**
   The phenomenon is always taken as real; the solution is only a candidate.
   The person raising the request (whether a user or an engineer) can only
   propose from the piece they themselves can see (see
   [cognition](../principles/cognition.md) and
   [have a view](../principles/have-a-view.md): what they said, what they
   want, and the real solution are often three different things).

2. **Dig upward for the purpose: what are they actually trying to accomplish?
   Why can't they accomplish it now?**
   Is it that they can't do it, that they don't know they can, or that doing
   it is too awkward? The solutions to these three are entirely different.
   Dig until "solving it at this level means a whole class of the same
   requests will never appear again" (see
   [dig to the root](../principles/dig-to-the-root.md)).

3. **Find the commonality: which existing requests is this one actually the
   same thing as?** The commonality is not at the level of the request. It is
   at the level of the definition. Something that recurs, or that many people
   mention in different words, is the most worth tracing upward.

4. **First try to add no code.**
   Before starting, confirm that the constraint this request presupposes is
   real (see
   [first confirm the constraint is real](verify-the-constraint.md)) — a lot
   of "this is the only way around it" was never checked. And don't stare
   only at the product layer itself: can something the user already has in
   hand (a general agent especially) take this over? (See
   [the three boundaries](../domain-mindsets/three-boundaries.md).)
   Then look in this order: can it be satisfied by **removing one
   constraint**? Can it be covered by making the existing thing **a bit more
   general**? Can it hold naturally by **deleting some special case**? Adding
   a new feature, a new switch, a new setting is the last choice — every
   entry point you add makes every other entry point harder to find.

5. **When comparing options, look at the repo's total amount of code, not the
   size of this change.** A change that writes three hundred lines but
   deletes five hundred is better than the option that only writes fifty.
   **A good option often leaves the total flat or even lower.** If every
   request raises the total, this repo is destined to grow into a pile of
   mud.

6. **If you really do have to add, get three sentences clear first**, then
   start: what it **is** (no tautologies), what it **replaces or absorbs**
   (see [before adding, say what it replaces](replace-dont-accumulate.md)),
   and what it **is not responsible for**.

7. **Look back once: did this option make the whole simpler or more
   complex?** Does the user have to learn one more concept because of it?
   Does the developer have to remember one more rule? **If the conclusion is
   "we'll have to teach the user how to use it", the design isn't finished.**
   If it got more complex, go back to step 3 — **this step is the point of
   the whole playbook**.

## Counter-effects and boundaries

- **It slows down small requests that are clear and urgent.**
  So only requests that **introduce a new concept** walk the whole path: a
  new file, a new module or type, giving an existing thing a responsibility
  it didn't have, changing an interface other people depend on. Copy edits,
  parameter tweaks, and fixes to implementation details — just do them. The
  criterion is **whether it introduces a new concept, not the line count** —
  splitting one large change into five small ones doesn't turn it into a
  small request.
- **Digging for the purpose is not a veto.**
  When you can't find a more general solution, honestly do what the person
  who raised the request said. "First think about whether we can avoid
  adding" is a question that must be answered, not a license to reject the
  request.
- **Total code volume is a criterion, not a KPI.**
  Compressing code into something unreadable to make the number look good, or
  deleting something that is genuinely needed, is far worse than writing a
  few more lines.
