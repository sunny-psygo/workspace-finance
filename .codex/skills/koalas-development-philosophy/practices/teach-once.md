# Explain the same thing to an agent a second time, and write it into the repo

**When you notice yourself explaining the same thing to the agent again —
write it into a skill, a prompt, or `AGENTS.md` in the repo, rather than
saying it again next time.**

## How to do it

- **The first explanation: saying it is enough.** It may be a special case of
  this one time.
- **The second explanation of the same thing: stop, and write it into the
  repo.** The standard for writing it clearly is the same as for writing a
  rule — **include the why**, or it will be applied wrongly in a different
  setting.
- Once written, treat it as code: **it will go stale, so review it along with
  everything else, and delete it when it stops being valid.**

## Effect

Prompts and skills are [means of production](../principles/what-is-a-repo.md),
not chat logs. Once written into the repo, it takes effect for everyone,
every agent, and every future session. Left in the conversation, it
disappears along with the context.

**Using "explained twice" as the trigger** is to avoid pre-compiling a pile
of rules nobody needs: the things genuinely worth writing down repeat
themselves.

## Counter-effects and boundaries

- **The biggest risk is only accumulating and never deleting.** A stale
  prompt doesn't error and nobody complains. It only quietly points the agent
  in the wrong direction. When you add it, think through when it should
  expire.
- **Don't turn one-time context into a permanent rule.**
  "Don't touch the database this time" is one-time. "Data migrations in this
  repo always go through the deployment side" is a rule.
- **What structure can solve, solve with structure first** (see
  [what a machine can enforce, don't write as a rule](machine-over-rules.md))
  — a prompt is also a form of asking the other party to be conscientious,
  only with the agent as the target.

From [what a repo is](../principles/what-is-a-repo.md).
