# Keep a living report for the owner, in the repo

**Each repo keeps one page for the person who owns the work. At the top: what
changed since the last report, what waits on them, and where things stand.
Below: the system, explained from first principles down to trying it
yourself. The page is a file in the repo, updated in the same commit as the
work it describes.**

This is the persistent form of
[supervising agents](../domain-mindsets/supervising-agents.md). The owner
comes back to any of several sessions, opens one file, and can judge the
work in minutes without reading a transcript.

## The shape

**The top is for the returning reader**, and answers three questions:

- **Since the last report**: each change with its reason and its evidence (a
  commit, a number), marked new, fixed, or found, and anything that came in
  over its estimate, by how much and why.
- **Needs you**: each decision, stated so it can be decided (see
  [if something is missing, ask](ask-when-unsure.md)), with your default.
- **Where it stands**: the state in a line (for example built, checks green,
  deployed or not); what works, with its evidence; what is unproven; what is
  deliberately not built yet; what blocks real use; what comes next.

**Below that is understanding, in the order a person judges**:

1. **First principles**: what is true about the problem whatever we build,
   each one forcing a property of the system.
2. **The idea behind the design**: the one move that satisfies them, with a
   diagram of the mechanism, and what the idea replaced. In eucalyptus,
   "identities form trees" replaced a human/AI flag, an accountable-party
   field, and a delegation table.
3. **The design**: the concepts, the interface, the rules that hold, what is
   outside on purpose, and the alternatives rejected, each with why.
4. **The implementation architecture**: the parts, the path one request
   takes, the files and their sizes, the gates.
5. **Try it yourself**: commands to copy, with the output to expect and what
   to watch for. Match lists searches to run, each with the wrong-but-close
   result an agent should reject.

The page links to the precise notes that agents need, such as the contract
or the core model, rather than copying them.

It is one self-contained HTML file, because it has to draw mechanisms, and
sometimes let the owner poke at real data. Match's page plots the real scores of every pair
of demo people: pick one, and you see who passes the threshold and who
shouldn't. A terminal can't do that, and neither can plain markdown.

## What keeps it true

- **One copy, in the repo.** Not a one-shot page, not a hosted mirror, not a
  note in an agent's memory. A copy drifts and is still trusted, and memory is
  visible to one agent on one machine. In all three repos where this started,
  the first agent reached for a hosted page, because its tools default to
  publishing one. In Match the page came back as a "mirror" after the
  correction, and in Kit it waited in a scratch directory "until the workflow
  finished". Both times the owner had to say it again.
- **Updated in the same commit as any change to what it describes, and the
  repo's `AGENTS.md` says so** in a line about how work is done in that repo,
  so it doesn't depend on one session remembering (see
  [everything chains back to the always-loaded file](chain-back-to-always-loaded.md)).
  A repo without a report gets one with its next piece of work; say so in
  that report.
  Eucalyptus's line: "Each piece of work ends by updating `overview.html` in
  the same commit: the status and 'since the last report' at the top, and
  every section the work changed." A comment at the top of the page says how
  to update it, where the updater is already looking.
- **Numbers are generated, not typed.** The code that measures a number
  writes it where the page reads it: Match's eval writes `report-data.js`,
  which the page loads with a `<script>` tag, so it works from disk where
  fetching a JSON file wouldn't. A typed number is a copy. Eucalyptus's
  line counts are typed, and the first time the page moved into the repo, its
  own bar was the one count that didn't get updated.
- **Commands are run exactly as printed before they go on the page**, and
  rerun whenever the interface or setup changes. The expected output says
  when it was produced. Kit adds a scenario only after it has run against a
  real server.
- **"Since the last report" is replaced, not appended.** The history is
  `git log -p` on the page.
- **It stays short.** Where the repo caps its documents, the page gets a cap
  of its own (eucalyptus: 600 lines, enforced by its check script), met by
  removing, not by compressing. Where it says what another document says, one
  of them goes:
  eucalyptus's page replaced its design README, so each piece of reasoning
  has one home (see [documentation](../domain-mindsets/documentation.md)).
- **It opens from disk with nothing else**: inline diagrams, no build, no
  server, its encoding declared. Match's page rendered correctly on the host
  and garbled its Chinese text when opened from disk, because only the host
  added the charset.

## Effect

- The owner can come back to any session after a day and judge it in
  minutes.
- **Drift becomes visible.** The deviation, the overrun, and the negative
  finding sit where the owner looks, not in scrollback.
- **Writing it checks the agent.** Rebuilding the system from first
  principles is where a confused design shows itself: if it can't be
  explained simply, the design is the problem.
- It is the entry point for a new person too, and for a new agent that needs
  the why.

## Counter-effects and boundaries

- **It costs every piece of work an update.** For a one-off script or a
  throwaway experiment, skip it. Anything expected to outlive the session
  gets one.
- **It is not the agent-facing design notes.** Agents need precise contracts;
  the page needs the order a person judges in. Keep both where the precision
  differs, and link rather than restate. Where the page says it all, let it
  replace the note.
- **It is the agent's account of its own work.** The mechanisms above make it
  checkable, not independent. The owner's own try-it, and a review by an
  [independent agent](engineered-context.md), stay necessary.
- **It is not a dashboard or an archive.** Anything at the top beyond its
  three questions is something the owner has to read past every time.

From [supervising agents](../domain-mindsets/supervising-agents.md),
[what a repo is](../principles/what-is-a-repo.md) (the explanation is a means
of production), [change the docs, the tests, and the implementation in the same commit](co-located-changes.md),
and [beware of coupling you can't see](../principles/hidden-coupling.md) (a
copy of the page, or a typed number, is exactly that coupling).
