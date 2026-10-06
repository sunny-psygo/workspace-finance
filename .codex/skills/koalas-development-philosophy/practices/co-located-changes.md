# Change the docs, the tests, and the implementation in the same commit

**In the commit that changes the implementation, change its docstring and its
tests along with it.**

## How to do it

- Don't open a new API document parallel to the code; write the description
  into the docstring.
- Put tests as close as possible to the code they test.
- If a change makes the docs or the tests stale, **the commit isn't finished
  yet**.

## Effect

It turns "remember to update the other directory" into "impossible not to
see". You can forget the document in the neighboring directory, but it is
hard to fail to see the three lines of docstring right next to the code.

## Counter-effects and boundaries

It doesn't apply to descriptions of **context and design philosophy** — they
don't correspond to the implementation's structure in the first place, and
forcing them into a docstring makes both sides hard to read. That kind of
thing should be its own volume (see
[documentation](../domain-mindsets/documentation.md)).

Also, don't turn it into "every change must come with a test": whether there
should be a test is [a separate judgment](../domain-mindsets/testing.md).
This one only governs "existing descriptions and tests must not go stale".

From [documentation](../domain-mindsets/documentation.md) and
[testing](../domain-mindsets/testing.md).
