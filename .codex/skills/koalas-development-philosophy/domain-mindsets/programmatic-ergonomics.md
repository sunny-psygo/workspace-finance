# The ergonomics of programmatic use

**The experience designed for people — and for AI — who use your thing by
writing code.**

**"Programmatic use" is broad**: the command line, a network API, a library
function called by another piece of code — whenever the user uses it **by
writing code** rather than by clicking an interface, this whole page applies.

Its criterion is the same as for a GUI experience
([make the good thing the default](../principles/excellence-by-default.md)),
except the user is replaced by something that **guesses as it writes**: a
developer guesses what your interface looks like by intuition, and so does
AI — the difference being that **when AI guesses wrong it doesn't stop to
ask. It writes wrong code that looks extremely reasonable.**

So the core of this whole page is: **make guessing right the default.**

## 1. Structure it whenever you can, and lift rendering out as its own layer

**Rule of thumb: use structured, typed data whenever possible.**
When it has to "collapse" into a blob of text (say, printed to the command
line for a person to read), **lift that collapse / rendering layer out on its
own**. Don't let it grow together with the layer that produces the data.

The reason is simple:

> **The degree of structure directly determines the degree of
> composability.**

A function that returns a typed object can be filtered, mapped, and fed to
the next function. A blob of assembled text can only be torn apart with a
regex — and a regex will eventually tear wrong.
**Neither people nor AI "call it once"**: they write scripts, they assemble
things, they connect your thing to other things (see
[provide building blocks, not features](../principles/building-blocks.md)).
Give one less layer of structure and they have one less degree of ability to
compose.

How to do it:

- **Core logic returns structured data** (types, schemas, objects), not
  strings that are already laid out.
- **Rendering is a thin layer on the very outside**: `--json` and the
  human-readable output **share the same data**, and only the last step
  differs. Compute the two sides separately and they will eventually
  disagree (see
  [beware of coupling you can't see](../principles/hidden-coupling.md)).
- **Text meant for a person to read must never become the input format of
  another program.** Logs, tables, and progress bars are rendering products,
  not interfaces.

## 2. Guessability comes before completeness of documentation

Without reading the docs, can you guess the function name, the parameter
order, the shape of the return value?

- **The same concept, the same word throughout.** Called `user` in one place,
  `account` in another, `owner` in a third, and the reader first has to prove
  whether they are the same thing (see
  [beware of coupling you can't see](../principles/hidden-coupling.md)).
- **Symmetric things should be symmetric.** If there is `open` there is
  `close`; don't reverse the parameter order of `encode` and `decode`.
- **Make guessing wrong hard, or make it explode immediately.** The worst
  case is guessing wrong and having it still run, only with the wrong
  result.

## 3. Every capability has to be callable from a script

- **No operation that "can only be done in the UI".** Whatever the GUI can
  do, a non-interactive entry point must be able to do too.
- **Output has to be machine-readable**: structured, or at least `--json`;
  and the format has to be stable. Making people and agents regex-match
  human-readable logs is manufacturing a coupling that will certainly break.
- **Exit codes have to mean something.**
- **Don't require interaction.** Anything that needs a carriage return to
  confirm needs a bypass like `--yes`; otherwise scripts and agents get stuck
  there forever.

## 4. Error messages are part of the interface, not something patched on afterward

**An agent's next action is decided almost entirely by your error text** —
it is the real-time instruction you give the agent. State three things:
**what happened, why, and what to do next.**

- **Fail fast and fail loudly.** Silent degradation, swallowed exceptions,
  and returning an empty result let the agent keep writing a long stretch on
  top of a wrong premise (see
  [excellence is the default](../principles/excellence-by-default.md)).
- The error should carry **the information that lets the person and the agent
  solve it themselves**: which field, what was expected, what was actually
  received.

## 5. What can be generated automatically is the best documentation

`--help`, type signatures, schemas — **an agent runs `--help` first, rather
than going to find the website.** These things are bound to the
implementation and never go stale (see
[documentation](documentation.md): if it can be generated, generate it).

## 6. Idempotent, retryable, rehearsable

An agent retries, runs concurrently, and resumes from an uncertain point
after an interruption, and **it has no reliable memory of "did I already do
this just now".**

- Be idempotent where you can.
- Irreversible operations need a `--dry-run`, and an explicit confirmation
  boundary.
- Don't design it as an implicit state machine of "first A, then B, then C"
  — intermediate states are where an agent gets lost most easily. Make each
  call self-contained where you can.

## 7. The output size has to be controllable

This one is specific to the AI era: a person can scroll and skip,
**an agent cannot**. Emitting a hundred thousand lines of logs in one go eats
its context budget directly (see
[attention in AI coding](attention.md): attention has a budget).

Default output should be short, with detail expanded by a parameter; long
output should be pageable or truncatable.

## How to test it

**Give an agent that has never read the docs a real task, armed with nothing
but `--help` and the type signatures, and watch where it gets stuck.** Judge
whether the interface is guessable from the actual attempt and its result;
don't take the agent's evaluation as the conclusion. This is one use of
[an independent agent with engineered context](../practices/engineered-context.md):
the character knows nothing, and gets only `--help`.

## What this is not

- **It is not building a special interface just for AI.**
  A good programmatic interface is equally good for people. Building two is
  two sources of truth, and they will eventually disagree.
- **It is not making the CLI / API a mirror of the GUI.**
  Translating the interface one button to one endpoint produces a pile of
  aggregates, not building blocks (see
  [provide building blocks, not features](../principles/building-blocks.md)).
- **It is not sacrificing clarity for brevity.**
  Easy to guess is not the same as sparing with characters. `rm -rf` is easy
  to type, but it is not easy to guess, and it is not easy to recover from.
