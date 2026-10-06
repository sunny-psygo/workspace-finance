# Product and interaction design

**The greatest products are all general.**
"Feature-rich" is not good. What is actually good is letting the user do
anything they want to do, using very few features that are extremely simple
and extremely natural — natural to the point where the user could not
possibly fail to use them.

Google replaced the layer upon layer of categorized directories in the
traditional portal and the BBS with one search box. ChatGPT replaced a whole
row of purpose-built tool entry points with one dialog box. What they can do
is not less. It is too much to list — because they never went and listed it.

Why "feature-rich" is the wrong direction:

- **The cognitive cost is shifted onto the user.** Once there are many
  features, the user has to solve a new problem before doing the thing:
  which feature is this done with? Every entry point you add makes every
  other entry point harder to find.
- **A feature list can never catch up with real needs.** A general design
  lets the user do things the designer never thought of, and that coverage
  cannot be reached by enumerating features.
- **It is often only good for showing off.** Adding features makes the amount
  of work easy to display; deleting features and redoing the design does not
  — but the latter is the actual skill. **Creative Koalas does not welcome
  piling on features as a way to display the amount of work.**

This is the same thing as "extrapolate in order to subtract" in
[minimalism](../principles/minimalism.md), applied to the product: find the
commonality across the requests, and collapse ten features into one more
general one.

How to do it:

- **Don't count the number of features.** What to look at is "what the user
  can do" divided by "what the user has to learn first".
- **When a new request arrives, ask first: can it be done without adding a
  feature?** Can making the one that already exists a bit more general cover
  this request?
- **If it needs a manual before it can be used, the design isn't finished.**
  The acceptance criterion for "simple and natural" is that the user needs no
  teaching — not that the documentation is well written.

Also, when designing anything for someone else to use, don't stare only at
the product layer itself. The product, the system formed by the product plus
other things that already exist, and the system formed once the user is
added, are three different boundaries. See
[the three boundaries](three-boundaries.md).

## Watch the whole experience through a character who doesn't know the design

**An agent is responsible for the whole product. Verification cannot stop at
the code.** The way to do it is
[an independent agent with engineered context](../practices/engineered-context.md):
the character is a user who doesn't know the design, and what they can
actually understand and accomplish is the evidence. Letting only people who
know the whole design do the evaluating makes it easy to mistake what you
yourself know for something the product has already made clear.

For a product, the characters that matter are a first-time user, a beta
tester, an administrator, a new maintainer, and a user coming back with old
habits. Testing first-time understanding means a clean context and only the
entry point that person would meet; testing a workflow means adding only the
task and the material a real user of it would have.

Watch how they find the entry point, look up help, understand the concepts,
try the operation, and handle failure, and only then ask why. Feed what you
find back into the product, the guidance, the docs, the deployment, and the
maintenance experience, and retry with a fresh character after a fix. The
method, and its limits, are in that practice: the result is evidence, and
whether to change is still judged by the product's purpose.
