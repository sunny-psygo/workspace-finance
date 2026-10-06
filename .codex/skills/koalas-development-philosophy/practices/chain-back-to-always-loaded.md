# Everything chains back to the always-loaded file

**Everything you want the AI to notice, followed upward along the pointers,
must eventually be able to reach `AGENTS.md` or `CLAUDE.md`.**

Among known mechanisms, **only these two files are guaranteed always loaded**
(Codex reads `AGENTS.md`, Claude Code reads `CLAUDE.md`; a skill has only its
`description` resident, and the body is read only when it is invoked).
Something that doesn't chain back to these two files has no mechanism
guaranteeing it will be seen.

**Things in the repo chain back to the repo's copy.** The user-level
`~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` are always loaded too, but they
take effect only on the machine where they were installed — hanging the
repo's things there means only you can see them. Conversely, **the repo's
always-loaded file must not contain machine-local paths**: it goes into git,
and an `@` import pointing at `~/` is a silently dead chain for coworkers and
for CI.

## How to do it

- **A new document in `design/`, a new skill, a new convention, a new
  directory — ask on the spot: starting from the always-loaded file, can you
  walk to it?** If you can't, add that link now.
- **It doesn't have to link directly.** There can be layers in between:
  `AGENTS.md` → `design/README.md` → `design/xxx.md`. But **every link needs
  one sentence of description**, so the person and the AI have a motive to
  walk on (see [attention in AI coding](../domain-mindsets/attention.md)).
- **Which file to chain back to depends on which agent this repo uses**: when
  both are used, the content goes in `AGENTS.md` and `CLAUDE.md` is a symlink
  to it, so one body of content is read by both sides.
- **Self-check**: search for where this file's name is mentioned in the repo.
  If only it mentions itself, it is an orphan.

## Effect

Writing it and not hanging it up is the same as not writing it — **and worse
than not writing it, because you believe it is doing its job**.

This splits "should it be written" and "once written, should it be hung up"
into two things. Everyone remembers the first. Almost nobody remembers the
second.

## Counter-effects and boundaries

- **Not everything has to be chained.** Chain only **what you want the AI to
  notice on its own**. But distinguish two kinds of "doesn't need chaining":
  **historical leftovers and temporary scripts nobody uses should not be in
  the repo at all** — what to do is delete them, not hang a sentence of
  "don't look at this" on them (see
  [what a repo is](../principles/what-is-a-repo.md): at any moment keep only
  what has earned its place, and leave history to git). Build artifacts and
  vendored third-party code do have to exist long-term, so separate them with
  `.gitignore` and directory conventions.
- **The always-loaded file is not a directory tree.**
  It is a **starting point**, not an index: only a few pointers at the first
  level, and deep things are carried there by the middle layers. Stuffing
  everything in means nothing gets noticed.
- **A chain that is too long breaks too.** Every extra link lowers the
  probability of arriving. The more important the thing, the shorter the
  chain — the most important ones are simply written directly into the
  always-loaded file.

From [attention in AI coding](../domain-mindsets/attention.md) and
[what a repo is](../principles/what-is-a-repo.md).
