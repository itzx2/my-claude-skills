# my-claude-skills

Personal Claude Code skills, synced across devices.

## Install on a new machine

Skills live under the `skills/` folder in this repo, so clone the repo
elsewhere and symlink that folder into `~/.claude/skills`:

```sh
git clone https://github.com/itzx2/my-claude-skills.git ~/my-claude-skills
ln -s ~/my-claude-skills/skills ~/.claude/skills
```

On Windows (PowerShell, run as Administrator):

```powershell
git clone https://github.com/itzx2/my-claude-skills.git $env:USERPROFILE\my-claude-skills
New-Item -ItemType SymbolicLink -Path $env:USERPROFILE\.claude\skills -Target $env:USERPROFILE\my-claude-skills\skills
```

Restart Claude Code after cloning.

## Install on a Claude Code cloud/remote environment

`scripts/session-start.sh` is the entry point. It does two things:

1. Mirrors `skills/` into `~/.claude/skills` (remote environments only — on a
   local machine that path is the symlink created above, and reinstalling
   would delete it).
2. Prints a briefing describing every installed skill, so the agent in that
   session knows what it has. See [Telling the agent what it
   has](#telling-the-agent-what-it-has) below.

Both steps need nothing but outbound HTTPS — no GitHub App / repo-source
access — so this works even in environments that don't have this repo
attached as a source.

### Scope: which sessions get this

| Where it's registered | Covers |
| --- | --- |
| `.claude/settings.json` (in this repo, committed) | sessions opened on **this repo** only |
| `~/.claude/settings.json` (user scope) | **every** session in that environment, whichever repo is open |

The repo-local file is already committed, so this repo needs nothing. For
everything else you need the user-scope registration — and in a cloud
container that is the catch: `~/.claude` is rebuilt from the image on every
provision, so anything written there by hand is gone next time.

`scripts/bootstrap-env.sh` solves that. Paste this into **Claude Code on the
web → environment settings → setup script**:

```sh
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | bash
```

It merges the `SessionStart` hook into `~/.claude/settings.json` at provision
time and installs the skills straight away, so the first session doesn't pay
the clone cost. Re-running never duplicates the hook entry, unrelated settings
are preserved, and a settings file it can't parse is left untouched rather
than overwritten. Hooks merge across settings scopes, so this coexists with
whatever the base image already registers.

The registered hook runs `~/.claude/session-start.sh` from disk rather than
piping a fresh `curl` into `bash` each session. That matters: the briefing
would otherwise be hostage to the network, and a GitHub blip at session start
would mean no briefing at all despite the skills already sitting in
`~/.claude`. `install-skills.sh` refreshes the cached scripts on every
successful install, so they stay current without the per-session fetch. With
the origin unreachable a session still gets its full briefing from cache; only
the skills refresh is skipped.

On a local machine, register the hook in `~/.claude/settings.json` yourself —
it persists there:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/session-start.sh | bash"
          }
        ]
      }
    ]
  }
}
```

No `$CLAUDE_CODE_REMOTE` guard needed — the script checks that itself and
skips only the install step when run locally, so a local machine still gets
the briefing for its symlinked skills.

## Telling the agent what it has

Claude Code shows an agent only the skills it is allowed to invoke itself.
Any skill with `disable-model-invocation: true` in its front matter is hidden
from the agent completely — it can't see it, can't call it, and can't suggest
it, because it has no idea the skill exists. Roughly half the skills here are
in that group.

`scripts/skills-briefing.py` closes that gap. It reads the front matter of
every skill in `~/.claude/skills` and emits a `SessionStart`
`additionalContext` payload splitting them into:

- **Model-invokable** — a compact roster, as a recall aid, with a nudge to
  reach for a matching skill instead of improvising.
- **User-invoked only** — name and description for each, plus instructions to
  recommend rather than invoke them (at most one per reply).

The payload also sets `reloadSkills: true`, so a session picks up skills the
same hook installed moments earlier instead of running with a stale list.

Run it standalone to see what the agent will be told:

```sh
CLAUDE_SKILLS_DIR=./skills python3 scripts/skills-briefing.py \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["hookSpecificOutput"]["additionalContext"])'
```

The briefing is generated from front matter at session start, so adding,
renaming, or reclassifying a skill needs no edit here — but note the skill
list further down this README is maintained by hand.

## Skills

37 skills. `/name` marks the ones Claude Code hides from the agent (`disable-model-invocation`), which only you can trigger — the rest the agent may invoke itself. This list is written by hand; the per-session briefing is generated from front matter and needs no edit here.

Seven of them are vendored from [emilkowalski/skills](https://github.com/emilkowalski/skills) — marked ⬇ below. They are design-engineering skills (animation and interface craft) rather than personal ones, kept here so they install and brief through the same path as everything else. See [Vendored skills](#vendored-skills) for what was changed on the way in.

- **animate** ⬇ — build an animation from scratch, making the decisions in the order that determines whether it feels right — should it animate at all, what purpose, which tool, which properties, which curve and duration, how it interrupts, how it exits.
- **animation-vocabulary** ⬇ — reverse-lookup glossary that turns a vague description of a web animation or motion effect into its exact term ("the bouncy thing when a popover opens" → Pop in).
- **apple-design** ⬇ — Apple's approach to interface design and fluid, physical motion, translated for the web.
- **/ask-matt** — ask which skill or flow fits your situation.
- **/batch-grill-me** — a relentless interview that asks every frontier question at once, round by round.
- **/claude-handoff** — hand the current conversation off to a fresh background agent that picks up the work immediately.
- **code-review** — review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?).
- **codebase-design** — shared vocabulary for designing deep modules.
- **diagnosing-bugs** — diagnosis loop for hard bugs and performance regressions.
- **domain-modeling** — build and sharpen a project's domain model.
- **emil-design-eng** ⬇ — Emil Kowalski's philosophy on UI polish, component design, animation decisions, and the invisible details that make software feel great.
- **find-animation-opportunities** ⬇ — search a codebase or UI for places that don't animate but should, and reject everything that shouldn't.
- **/grill-me** — a relentless interview to sharpen a plan or design.
- **/grill-with-docs** — a relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
- **grilling** — grill the user relentlessly about a plan, decision, or idea.
- **/handoff** — compact the current conversation into a handoff document for another agent to pick up.
- **/implement** — implement a piece of work based on a spec or set of tickets.
- **improve-animations** ⬇ — survey a codebase's animation and motion code, then produce a prioritized audit and self-contained implementation plans for other agents (or cheaper models) to execute.
- **/improve-codebase-architecture** — scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
- **karpathy-guidelines** — behavioral guidelines to reduce common LLM coding mistakes.
- **/loop-me** — grill me about specs for the workflows I want to build, within this workspace.
- **prototype** — build a throwaway prototype to answer a design question.
- **research** — investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo.
- **resolving-merge-conflicts** — use when you need to resolve an in-progress git merge/rebase conflict.
- **/review-animations** ⬇ — review animation and motion code against a high craft bar; default to flagging, approval is earned.
- **scrutinize** — outsider-perspective end-to-end review of a plan, PR, or code change.
- **/setup-matt-pocock-skills** — configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, and domain doc layout.
- **tdd** — test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
- **/teach** — teach the user a new skill or concept, within this workspace.
- **/to-questionnaire** — turn a decision you can't fully answer into a questionnaire for someone else to fill in.
- **/to-spec** — turn the current conversation into a spec and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed.
- **/to-tickets** — break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker — edges as text in one file per ticket locally, or native blocking links on a real tracker.
- **/triage** — move issues and external PRs through a state machine of triage roles — categorise, verify, grill if needed, and write agent-ready briefs.
- **/wait-what** — stop. That last message did not land — re-pitch it.
- **/wayfinder** — plan a huge chunk of work — more than one agent session can hold — as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
- **wizard** — generate an interactive bash wizard that walks a human through steps only they can perform.
- **writing-for-agents** — writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md.

## Vendored skills

The ⬇ skills above are copied from [emilkowalski/skills](https://github.com/emilkowalski/skills)
(vendored at upstream commit `78761e1`, 2026-08-10) rather than installed via
`npx skills add`, so they ride the same install-and-brief path as everything
else here.

**Not taken:** `pick-ui-library`, `prototype`, `ask-sonner`. `prototype` would
have collided with the personal skill of the same name.

**Changed on the way in:** one line. `animate` told the agent to "stop and
invoke `pick-ui-library`", which isn't installed here — and upstream that
pointer was already dead, since `pick-ui-library` sets
`disable-model-invocation: true` and so is invisible to the agent anyway. It
now names the primitives directly (Base UI, cmdk, Sonner). Everything else is
byte-identical to upstream.

**Known upstream issues, carried as-is.** Left unpatched deliberately, so
re-pulling from upstream stays a clean copy rather than a merge:

- The `prefers-reduced-motion` snippet in `emil-design-eng`, `animate`,
  `review-animations/STANDARDS.md`, and `improve-animations/AUDIT.md` *adds* an
  animation instead of cancelling the transform it's meant to replace. Copying
  it verbatim ships a reduced-motion block that doesn't reduce motion.
  `apple-design` has the correct form (`transform: none !important`).
- `improve-animations`' Hard Rules ("never modify source code", "read-only
  analysis only") contradict its own `execute <plan>` invocation variant.
- `emil-design-eng` and `apple-design` disagree on the default spring
  (`bounce: 0.2` vs `bounce: 0`).
- `review-animations` never defines what "the diff" is, so its scope varies run
  to run.
- The rule catalog (frequency table, duration table, easing tokens) is
  duplicated across 5–7 files with no source of truth.
