# Playbook: starting a new project

## Steps

1. **First get clear on "what this is, and why", and define the purpose at
   the level of cognition**: flash or familiarity for the user? Positioned as
   a trendy AI app or as national-scale infrastructure? What does **not**
   belong to it? If you can't write it down, don't start — that means the
   thing to be built hasn't been thought through yet.

   Write it in two places: **the short version goes straight into
   `AGENTS.md`** (it is always loaded, and what we want is exactly that the
   AI carries the right cognition at all times), and **the full background,
   context, and design philosophy go into `design/`**, pointed to from
   `AGENTS.md` (see
   [a repo needs "what this is, and why"](context-entry-point.md)).

2. **Find the general form of the thing.** Don't ask "how do I implement this
   request". Ask "what is this thing": a slide deck is a set of images; Codex
   and Claude Code are general intelligent executors that merely lack a
   convenient tool. **First see whether you can borrow a general capability
   that already exists and only supply the missing piece yourself** — this
   step decides whether what follows is a hundred lines or ten thousand.

3. **Draw the three boundaries, and list the usable "other things"**: the
   product itself / the product plus other things that already exist / plus
   the user (see
   [the three boundaries](../domain-mindsets/three-boundaries.md)). Ask first:
   what does the user already have in hand? Do a general agent, make, git,
   and the browser count as reachable? **What can land on the second layer
   should not be built into the first** — the first layer does only the thing
   nobody else can do and nobody will do for you.

4. **Set the first version: the smallest loop that runs end to end.**
   Not the first item on a feature list, but the shortest path that "works
   from start to finish". Once the loop closes, your cognition of the thing
   will change, and that is when you decide what the second step is.

5. **Choosing technology starts with "what ought this thing to look like"**,
   and only then the tool: pick the one that makes good the default and makes
   bad uncomfortable, and keep checking yourself on "am I using it with the
   grain, or working around it". Familiarity and popularity come last (see
   [technology choice](../domain-mindsets/tech-choice.md)).

6. **Set up the means of production first.** The skeleton is at least this:

   ```
   AGENTS.md          the short version of the purpose and the cognition + a pointer to design/
   CLAUDE.md          -> AGENTS.md (a symlink; Codex reads the former, Claude Code the latter)
   design/            the full text of the background, context, cognition, and design philosophy
   design/report.html the living report for the owner, updated with every piece of work
   .agents/skills/    this repo's own skills (an empty directory gets a .gitkeep first)
   .claude/skills     -> ../.agents/skills (a symlink, so one body of content is read by both agents)
   ```

   Plus CI, formatting, and type checking. The report starts with the first
   piece of work (see [keep a living report](living-report.md)).
   **This is the cheapest moment to make the good practice the default.**
   Adding it later costs ten times as much (see
   [excellence is the default](../principles/excellence-by-default.md)).

7. **Write down "what we are not doing".** With the boundary written clearly,
   you have something to check against every later time someone proposes
   "let's support this too while we're here".

## Counter-effects and boundaries

- **The biggest risk is turning into a grand design before any work starts.**
  That one page from step 1 and the smallest loop from step 4 should together
  be done within a day or two. Beyond that, you are building the product on
  paper, not thinking it through.
- **When step 2 can't find the general form, don't force one.**
  If you can't think of it, do it in the most straightforward way for now,
  but write the fact down — the general form often surfaces only after the
  first loop is closed.
