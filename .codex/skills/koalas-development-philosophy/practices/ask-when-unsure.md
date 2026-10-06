# If something is missing, ask. Don't guess

**When context, cognition, or positioning is missing, ask. Don't guess and
keep writing.**

## First distinguish which kind is missing

| What's missing | Example | What to do |
| --- | --- | --- |
| **Context** (facts) | Who uses this module? Where does this field come from? | **Look it up yourself first**: read the callers, the commit history, the issues. Ask only when you can't find it. |
| **Cognition** (what this thing is) | Where is this system's boundary? What does this concept actually refer to? | **Ask directly** — it lives in a person's head, not in the code. |
| **Positioning** (how far this should go) | Who is it for? How long does it live? Internal tool or external product? | **You must ask** — it decides the standard for the tradeoff (see [seek truth from facts](../principles/seek-truth-from-facts.md)). |

## How to ask

- **Ask carrying your guess.**
  "I understand this is for internal use and won't live past three months, so
  I plan to skip backward compatibility — right?" is far more useful than
  "how do you want this done?" — the latter pushes the cognitive burden back
  onto the person.
- **Ask it all at once. Don't extract it drop by drop.** List the questions,
  and mark which one affects the plan the most.
- **Give a default answer, then ask.**
  "Unless told otherwise, I'll do X" — so even if the other person has no
  time to reply just now, you aren't stuck.
- **Make the question decidable.** Define each term, and show what each
  option means in one small worked example from the real system, what it
  costs, and why it has to be settled now. "Pull complete, push hint?" got an answer in Match, and a day later
  the owner asked what it meant. **An answer given without understanding is
  not a decision**: when you find one, re-explain and re-ask.

## Effect

The cost of guessing wrong is a whole stretch of misaligned implementation,
and it looks self-consistent, so nobody notices immediately. The cost of
asking is one minute. This price comparison holds at any time.

## Counter-effects and boundaries

- **Asking too much is outsourcing the thinking to the person**, which is
  another kind of irresponsibility. **What you can look up yourself, you must
  look up yourself.** What is worth asking is what "exists only in a person's
  head".
- **Don't let the question become a block.** Give a default plan and keep
  moving, while marking the question explicitly, rather than stopping there
  to wait.
- **Don't ask while firefighting.** Restore first; the questioning waits
  until after the bleeding has stopped.

From [cognition](../principles/cognition.md) and
[have a view](../principles/have-a-view.md).
