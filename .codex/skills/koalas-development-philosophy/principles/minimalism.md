# Minimalism

**The smallest solution that fully solves the problem is the best solution.**
Every line of code, every file, dependency, config option, and abstraction
must earn its existence by solving a problem that is real right now.

**This is not only about code.** Docs, rules, processes, and policies are
things you have to maintain too. They go stale, contradict themselves, and
get bypassed, so the same standard applies.
**The product itself even more so**: the more features you pile on, the less
people use them.
See [product and interaction design](../domain-mindsets/product-design.md)
and [documentation](../domain-mindsets/documentation.md).

Minimalism is not writing less than the problem needs. It is refusing to
write what the problem does not need.

## Why

**Because [code is a means, and a liability](what-is-code.md)** —
the ability to solve the problem is the asset; code is only the price of
getting it. And that liability keeps paying interest: cost of understanding,
surface area for bugs, cost of change.
Given that, buying the same ability means paying as little as possible.

Prose owes one more debt: **a rule nobody reads is worse than no rule.**
Once the length exceeds what anyone will read, the few lines that actually
matter get skipped along with the rest.

**Everything below is a corollary of that, not a checklist.**
When some item conflicts with the intent — buy the ability at the smallest
price — follow the intent.

## Two modes of decay

A clean codebase decays into a system nobody dares to touch through exactly
two patterns:

1. **Features before necessity — the need does not exist yet, the feature
   ships anyway.**
   Things written for "we might need it later", "just in case", "it has to
   be production-grade", "the feature set must be complete" make up most of
   what nobody uses and nobody dares to delete.

2. **Build too literally — stare only at what is in front of you, and patch
   whatever is missing.**
   Each request is treated as an isolated thing: one arrives, you add a
   block; another arrives, you add an if. Every single change looks
   "minimal" and unobjectionable, but the commonality across requests is
   never extracted, so duplication, special cases, and branches keep piling
   up. The more you write, the more it looks like a pile of mud.
   The root is **demand-driven development**: requests are scattered and
   unrelated, and implementing them one by one produces a pile of unrelated
   things (see [upfront design beats firefighting](upfront-design.md)).

The second is stealthier, and **it is especially easy to hide behind
minimalism**: "I only did what was needed right now" is not a defense —
a pile of locally minimal changes can add up to a grossly bloated whole.

## Extrapolate in order to subtract

So development needs a general, long view:
**even a very specific request should be pushed one level up, to find the
simple, elegant, general design.**

The direction of that extrapolation is where this rule gets reversed most
often:

- **Extrapolation is not for adding.**
  It is not an excuse to add robustness, production-grade hardening, feature
  completeness, config options, or extension points in the name of
  "generality". That is exactly the first mode of decay, dressed up.
- **Extrapolation is for subtracting.**
  Finding the commonality is how ten special cases collapse into one rule,
  ten similar blocks become one, and three branches disappear.
  **After extrapolating, there should be less code. If there is more, what
  you found is not a commonality, it is an excuse** — and that is a ready-made
  ruler for noticing you have drifted.
- **Subtracting is what leaves room for the future.**
  Being general is itself what makes something extensible: a design that
  actually catches the essence of the problem often needs no change at all
  for the next request. Guessing the future and pre-building extension
  points cannot buy this — guessing wrong is waste, and guessing right means
  you have been paying interest the whole time.

Where do you extrapolate toward? Toward **what this thing actually is**.
The commonality is not at the level of the request; it is at the level of
the definition. Seeing that "a slide deck is a set of images" beats adding
ten stages to a slide-generation pipeline.
That is exactly what [upfront design beats firefighting](upfront-design.md)
is about: **minimalism is the result; getting the abstraction right is the
cause.**

**Writing ten thousand lines and shipping a hundred features in a day is not
skill.** The skill is spending half a day getting the design right, then
half a day using a hundred lines and ten features to do what those ten
thousand lines and a hundred features were going to do.

## Concrete claims

1. **Solve only the problem that was raised, not the ones beside it.**
   "We might need it later" is the largest source of waste.
   This means **don't build the neighboring features**, not "don't think
   about the neighboring structure": think as much as you should, and
   thinking it through usually means writing less, not more.
   **What you defer is features and extension points, not the abstraction.**
   The abstraction has to be thought through at the start — it cannot be
   deferred, and reworking it later costs far more.

2. **Don't introduce a new concept until it has two real users.**
   A base class, interface, utility module, or config switch with a single
   call site is not an abstraction; it is a detour. It adds a layer someone
   has to understand and buys no reuse.
   This does not contradict "find the commonality" above; the difference is
   only whether the change adds or removes: merging existing duplication
   makes the code smaller, reserving a layer for an imagined user makes it
   larger.

3. **Prefer deleting code to adding code.**
   If a request can be met by deleting code, that is the better move.
   Deleted code cannot have bugs.

4. **Keep the number of moving parts small.**
   Functions over classes, files over packages, plain data structures over
   frameworks. A dependency you never introduced is one you never have to
   upgrade, audit, or debug.

5. **Leave no dead paths.**
   Don't add a switch for a single caller, don't branch for a case that
   cannot happen, don't hide bugs with try/except, don't keep a
   compatibility layer for a version nobody runs, and don't write defensive
   fallbacks for state your own code fully controls.
   A dead path is harmful because it looks like it works: nobody has ever
   executed it, so nobody knows it is wrong.
   Let unreachable states crash loudly.

6. **Configuration is the last resort.**
   Adding an option is a promise to support every combination of it forever.
   Pick one good default and hardcode it until someone actually needs
   another value. When variation is genuinely needed, satisfy it with
   **composition**, not parameters
   (see [composition over configuration](composition-over-configuration.md)).

7. **Say each thing once.**
   Every fact has one source, or the copies will eventually disagree.
   But duplication is cheaper than a wrong abstraction — a wrong abstraction
   implicates every user of it — so wait until the third occurrence, when
   you can see what the commonality actually is, before merging.

## How to use it

Before adding anything, answer: **if I don't add this, what breaks today?**
If the answer is "nothing", don't add it.

When a change keeps growing, it is usually because the problem was never
narrowed in the first place. Stop, restate the problem in one sentence, and
solve only that sentence.

Before starting, also ask: **what does this request have in common with the
ones already done? Can they become the same thing?** Think it through before
writing; don't lay bricks while still deciding the shape.

The order of preference: **delete something** → **change something that
exists** → **add the smallest new thing you can**.

## What minimalism is not

These are the common misuses of reading the items above as rules rather than
as intent:

- **It is not making the code short.**
  Clear names and straightforward control flow are not redundancy. Sacrificing
  readability for brevity raises the cost of understanding — the opposite of
  what this rule wants.
- **It is not doing less.**
  What was asked for gets delivered in full. Minimalism cuts the machinery
  the solution needs, not the request itself.
- **It is not skipping the tests, types, and error handling that real
  failure modes need.**
  Handle errors that really happen; ignore the ones that cannot. A test
  written for a real failure mode is paying down debt, not taking it on.
- **It is not laying bricks to the letter of the request.**
  "Only do what is needed right now" is about the scope of features, not the
  scope of thinking. Skipping the design and patching whatever is missing is
  the second mode of decay, not minimalism.
- **It is not deleting early.**
  Before deleting a piece of code, find out why it exists. Looking redundant
  often only means you have not found its user yet.
