# Give the rationale, not just the rule

**A rule detached from its rationale stops working.**
Every rule has to be delivered together with the problem it is trying to
solve: not "do it this way", but "because this problem would otherwise
happen, do it this way".

Correspondingly, the reader has to **read the intention, not the text**
(read the intentions, not the rules).

## Why

1. **The text will always be outflanked by reality.**
   Rules are finite and situations are infinite. In a case the text doesn't
   cover, only the rationale can be extrapolated from. A person or an agent
   who memorized only the letter either freezes or does something absurd by
   following the letter.

2. **A rule without a rationale gets executed formally.**
   "Tests are mandatory" then produces tests that assert `assert True`.
   The motion was copied; the effect was not. The rationale is the
   acceptance criterion.

3. **People need a rationale before they actually agree.**
   A rule they don't agree with doesn't disappear. It goes underground —
   bypassed, complied with on paper, complained about in private. Explaining
   why is the only cheap way to make a rule actually take effect.

4. **A rule without a rationale can never be deleted.**
   Nobody knows what it was guarding against back then, so nobody dares to
   touch it. The rules only ever grow, until they are too thick for anyone
   to read (see [minimalism](minimalism.md)). Writing down the rationale
   attaches the rule's expiry condition: when that problem no longer exists,
   you can delete the rule with a clear conscience.

5. **AI needs the rationale even more.**
   An agent is good at following the text, and exactly because of that it is
   more likely to do the wrong thing outside the text's boundary. The
   rationale is the only input that lets it extrapolate correctly.

## How to do it

- **Follow every rule with one sentence of "because…".** One sentence is
  enough, stating the failure it blocks.
- **Write the concrete situation it is trying to prevent, not an abstract
  virtue.** "Keep the code maintainable" is not a rationale. "Changing one
  place means changing three others in sync, and one of them will eventually
  be missed" is.
- **Say explicitly whether this is advice or a hard constraint**, and what
  an exception looks like. Most rules are advice. Real hard constraints
  (safety, compliance, data that cannot be recovered) should be marked
  separately, so they don't drown among the advice.
- **Keep the derivation, not only the conclusion.** Conclusions expire; the
  derivation lets a later person judge again.
- **Decisions too.** Commit messages, code review comments, and technology
  choice records should say why this was chosen, not only what was chosen.

## When you meet an unreasonable rule

1. Find its rationale first — including the one that was never written down.
   If you can't see what a rule is guarding against, you usually haven't
   seen the whole of it yet.
2. **When a rule conflicts with its own intention, follow the intention**,
   then go back and fix the rule.
3. Don't bypass it silently. Bypass it once and the rule loosens one notch
   for everyone, and nobody knows.

## What this rule is not

- **It does not ask for a long argument under every sentence.** A rationale
  should be sayable in one sentence. If it isn't, the rule itself usually
  hasn't been thought through.
- **It is not "a rationale means you may violate it freely".** Reading the
  intention is for getting it right where the text doesn't cover, not for
  finding an excuse to avoid complying. The bar for the judgment is: you can
  say why following the intention is better, and you are willing to write
  that judgment down.
- **It does not delegate authority without limit.** For safety, compliance,
  and irreversible operations, do as told and discuss afterward.
