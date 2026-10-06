# What a machine can enforce, don't write as a rule

**If a convention can be guaranteed by types, lint, CI, a template, or
directory structure, don't write it as a rule in a document.**

## How to do it

Before adding a rule, look for a substitute in this order:

1. **Types** — make the violating way of writing fail to compile.
2. **Lint / CI** — make the violating way of writing fail to merge.
3. **Templates, scaffolding, default configuration** — make the correct way
   of writing the path of least effort.
4. **Directory structure** — make things only placeable in the right place.
5. Only when none of the above can do it, write it as a rule.

## Effect

A rule asks every person to conscientiously fight the default every time. The
cost is paid continuously, and it is eventually lost. Handed to a machine, it
becomes a default that is free and never forgets.
**This is especially effective on an agent**: it won't remember your rules,
but CI will stop it.

## A "careful" in a comment is the weakest guardrail

A comment like `# note: changing this means changing X in sync` is, at
bottom, the same thing as a rule written in a document: it asks everyone who
passes by to see it, understand it, and comply.

**Where being wrong is expensive (leaking data, losing data, spending
money), don't warn with a comment. Block it with structure**: gather the
dangerous capability into a place with exactly one entry point, so the wrong
usage simply cannot be called. Everywhere else this isn't necessary — the
guardrail itself has a cost.

## Counter-effects and boundaries

- **Don't build a framework in order to eliminate one rule.** The cost of the
  guardrail must be smaller than the loss it blocks, or you have moved the
  complexity out of the document and into the code.
- **Don't force what can't be governed.** Judgment, tradeoffs, and taste in
  design are things a machine cannot govern, and forcing them into checks
  only produces a pile of bad designs that pass the checks.
- **What the machine governs has to be overridable**: leave an explicit way
  around it, or people will take a much longer detour when they hit an
  exception.

From [excellence is the default](../principles/excellence-by-default.md).
