# my-claude-skills

Personal Claude Code skills, synced across devices.

## Install on a new machine

This repo is a Claude Code plugin marketplace. Install it:

```sh
claude plugin marketplace add https://github.com/itzx2/my-claude-skills.git
claude plugin install my-claude-skills@my-claude-skills
```

That installs at **user scope**, so the skills load in every session in every
directory, and the SessionStart briefing (below) ships with it. Restart Claude
Code afterwards — skills are enumerated once, at session start.

No clone, no symlink, no Administrator shell on Windows. Update later with
`claude plugin update my-claude-skills`.

### Invocation names are namespaced

Claude Code namespaces plugin-provided skills, so anything installed this way is
invoked as **`/my-claude-skills:<name>`** — not `/<name>`. The bare form applies
only to loose skills sitting directly in `~/.claude/skills`.

The older symlink install (clone elsewhere, `ln -s` the `skills/` folder into
`~/.claude/skills`) still works and keeps the bare names, but needs an
Administrator shell on Windows and does not carry the briefing hook. Prefer the
plugin.

## Install on a Claude Code cloud/remote environment

**Nothing to configure — this repo installs itself.** `.claude/settings.json`
declares the marketplace and enables the plugin, and
`.claude/hooks/session-start.sh` fetches and installs it on every session start.
A cloud container clones the repo, the hook runs, and the skills are there.

That indirection is required, not belt-and-braces: declaring a marketplace in
`.claude/settings.json` does not put it on disk, and as of Claude Code v2.1.195 a
plugin enabled only by project settings and sourced from GitHub does not load
until something installs it. The hook is that something. See
[`.claude/PLUGIN-SETUP.md`](./.claude/PLUGIN-SETUP.md) for the failure modes,
and copy that pair of files into any repo that wants the same.

`scripts/session-start.sh` + `scripts/bootstrap-env.sh` remain as a **fallback**
for environments where you cannot commit to the repo — they install skills loose
into `~/.claude/skills` and brief from there. Prefer the committed hook.

### Scope: which sessions get this

| Where it's registered | Covers |
| --- | --- |
| this repo's `.claude/settings.json` | every session **on this repo** — installs the plugin so a fresh container has it |
| the plugin's own `hooks/hooks.json` | **every** session wherever the plugin is installed — where the briefing comes from |
| `~/.claude/settings.json` (user scope) | **every** session in that environment, whichever repo is open |

Installing the plugin registers the briefing hook by itself, so there is nothing
further to do on a machine that has it.

The repo-local `.claude/settings.json` is back, but it no longer briefs. It
installs. The plugin still ships the only briefing, in `hooks/briefing.js`, so
the two hooks compose rather than collide: one line of install status from the
repo hook, the roster from the plugin. The earlier double-briefing came from
`scripts/skills-briefing.py` emitting a second, bare-named roster; that script is
deleted.

For the fallback path you need the user-scope registration — and in a cloud
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

`hooks/briefing.js` closes that gap. It ships **inside the plugin** and
registers itself via `hooks/hooks.json`, so installing the plugin is the only
setup step — there is no `~/.claude/settings.json` to edit and no repo-relative
path to get wrong.

At session start it walks what is actually installed:

- every **enabled** plugin's `skills/` *and* `commands/` directories, with paths
  read from `~/.claude/plugins/installed_plugins.json` and enabled state from
  `~/.claude/settings.json`
- `~/.claude/skills` and `~/.claude/commands` for loose personal ones
- `$CLAUDE_PROJECT_DIR/.claude/skills` and `commands` for the open repo's own,
  listed under their own heading since they vanish when another repo is opened

The skills walk **recurses**, because a skills directory can hold container
directories rather than skills — `~/.claude/skills/synced/` groups the
account-synced ones. A directory holding `SKILL.md` is a skill and is never
descended into; anything else is a container and is walked. Nesting never
contributes to the name: `synced/xlsx` is invoked as `xlsx`, since only a
plugin's identity creates a prefix. (Commands are the deliberate exception —
`commands/foo/bar.md` really is `foo:bar`.)

then emits a `SessionStart` `additionalContext` payload splitting them into:

- **Model-invocable** — a compact roster, as a recall aid, with a nudge to reach
  for a matching skill instead of improvising.
- **User-invoked only** — name and full description for each, plus instructions
  to recommend rather than invoke them.

Both directories matter: a plugin can ship behaviour as a skill (a directory
with `SKILL.md`) or a command (a single `.md` file), and Claude Code lists both.
Reading only `skills/` silently drops whole plugins.

Each entry carries its exact invocation, `plugin:` prefix included, since that
is the one thing the agent cannot reconstruct on its own.

A name that resolves from two places at once — the classic being a leftover
`~/.claude/skills` symlink alongside the same skills installed as a plugin — is
listed under **⚠ Installed more than once** rather than deduped. Both
invocations really do work, so dropping one would make the roster lie; but it
almost always means a half-finished migration, and this briefing is the only
thing positioned to notice.

The roster also states what it *cannot* see. Skills supplied by the harness
rather than installed on disk can't be enumerated by any hook, so the briefing
says so and points at the Skill tool listing for them, instead of implying that
an absent name means an absent skill.

Three scripts check it, and all exit non-zero on failure:

```sh
bash scripts/test-briefing.sh      # fixture tests for the walk itself
bash scripts/test-install-race.sh  # two installs at once stay correct
bash scripts/verify-install.sh     # is every skill in skills/ reachable right now?
```

`test-briefing.sh` builds throwaway directories — a nested container, a plugin
with skills and commands, a disabled plugin, a project dir, a deliberate
duplicate — and asserts the rendered roster. Every bug it guards against is a
silent one: a wrong walk still emits a plausible roster, just short. That is how
the `synced/` gap survived unnoticed.

`test-install-race.sh` runs the real installer two-up against a fixture source.
A session on this repo registers the SessionStart hook twice — user-level and
repo-level — and Claude Code runs both in parallel, so overlapping installs are
the normal case here, not an edge one. Before `install-skills.sh` took a lock,
ten such trials produced a correct manifest zero times.

`verify-install.sh` is the machine answer to "did the install work?", for use
after the session-start hook in a fresh container. It accepts either installed
shape, plugin-namespaced or bare.

Run the briefing standalone to see what the agent will be told:

```sh
node hooks/briefing.js \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).hookSpecificOutput.additionalContext))'
```

**Why Node rather than bash + python.** On Windows `bash` frequently resolves to
WSL — a different filesystem with a different `$HOME` — and `python3` to the
Microsoft Store stub, so a shell-shimmed hook silently briefs nothing. Node is
one binary that behaves identically everywhere Claude Code runs.

The briefing is generated from front matter at session start, so adding,
renaming, or reclassifying a skill needs no edit here — but note the skill list
further down this README is maintained by hand.

### Scope note

The briefing sees local plugins only. Skills that arrive with the harness or
from claude.ai-managed plugins never touch `~/.claude/plugins`, so they appear
in the agent's Skill listing but not here. The two sources are complementary,
which is why `ask-matt` reads both.

## Skills

41 skills. `/name` marks the ones Claude Code hides from the agent (`disable-model-invocation`), which only you can trigger — the rest the agent may invoke itself. This list is written by hand; the per-session briefing is generated from front matter and needs no edit here.

The leading `/` below is a **marker for that distinction, not the invocation**. Installed as a plugin, every name here is prefixed: `/my-claude-skills:to-spec`, `my-claude-skills:grilling`, and so on. Only the legacy symlink install leaves them bare.

Ten of them are **vendored** — copied in from another repo rather than installed beside this one, so they ride the same install-and-brief path as everything else. Marked ⬇ below: eight design-engineering skills (animation and interface craft) from [emilkowalski/skills](https://github.com/emilkowalski/skills), and two branch-lifecycle skills from [obra/superpowers](https://github.com/obra/superpowers). See [Vendored skills](#vendored-skills) for what changed on the way in.

- **animate** ⬇ — build an animation from scratch, making the decisions in the order that determines whether it feels right — should it animate at all, what purpose, which tool, which properties, which curve and duration, how it interrupts, how it exits.
- **animation-vocabulary** ⬇ — reverse-lookup glossary that turns a vague description of a web animation or motion effect into its exact term ("the bouncy thing when a popover opens" → Pop in).
- **apple-design** ⬇ — Apple's approach to interface design and fluid, physical motion, translated for the web.
- **/ask-matt** — ask which skill or flow fits your situation.
- **/batch-grill-me** — a relentless interview that asks every frontier question at once, round by round.
- **/claude-handoff** — hand the current conversation off to a fresh background agent that picks up the work immediately. Deliberately *not* aligned with `/handoff`: it seeds an agent's prompt rather than writing a file, so none of the live-brief rules apply to it.
- **code-review** — review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?).
- **codebase-design** — shared vocabulary for designing deep modules.
- **diagnosing-bugs** — diagnosis loop for hard bugs and performance regressions.
- **domain-modeling** — build and sharpen a project's domain model.
- **emil-design-eng** ⬇ — Emil Kowalski's philosophy on UI polish, component design, animation decisions, and the invisible details that make software feel great.
- **find-animation-opportunities** ⬇ — search a codebase or UI for places that don't animate but should, and reject everything that shouldn't.
- **finishing-a-development-branch** ⬇ — decide how finished work gets integrated — merge locally, open a PR, or keep the branch — then execute that choice and clean up the workspace.
- **/grill-me** — a relentless interview to sharpen a plan or design.
- **/grill-with-docs** — a relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
- **grilling** — grill the user relentlessly about a plan, decision, or idea.
- **/handoff** — compact the current conversation into a handoff document for another agent to pick up.
- **/implement** — implement a piece of work based on a spec or set of tickets.
- **improve-animations** ⬇ — survey a codebase's animation and motion code, then produce a prioritized audit and self-contained implementation plans for other agents (or cheaper models) to execute.
- **/improve-codebase-architecture** — scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
- **karpathy-guidelines** — behavioral guidelines to reduce common LLM coding mistakes.
- **/loop-me** — grill me about specs for the workflows I want to build, within this workspace.
- **pick-ui-library** ⬇ — pick the right library for a given frontend task from a curated, opinionated list — toasts, UI primitives, command menus, charts, virtualization, drag and drop, animated numbers, OTP inputs, state, styling.
- **/project-brain** — scaffold a project's `AGENTS.md` router and domain model so any agent can orient cold.
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
- **using-git-worktrees** ⬇ — set up an isolated workspace on a green baseline, so feature work leaves the current checkout untouched.
- **/wait-what** — stop. That last message did not land — re-pitch it.
- **/wayfinder** — plan a huge chunk of work — more than one agent session can hold — as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
- **wizard** — generate an interactive bash wizard that walks a human through steps only they can perform.
- **writing-for-agents** — writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md.

## Vendored skills

Two upstreams, vendored on different terms. The design-engineering set is
copied nearly verbatim; the branch-lifecycle pair was rewritten on the way in,
for the reason recorded under its own heading.

### From emilkowalski/skills

Copied from [emilkowalski/skills](https://github.com/emilkowalski/skills)
(vendored at upstream commit `78761e1`, 2026-08-10) rather than installed via
`npx skills add`, so they ride the same install-and-brief path as everything
else here.

**Not taken:** `prototype`, `ask-sonner`. `prototype` would have collided with
the personal skill of the same name.

**Changed on the way in:** `pick-ui-library`'s front matter only. Upstream it
sets `disable-model-invocation: true`, which made it invisible to the agent —
and left `animate`'s "stop and invoke `pick-ui-library`" pointing at something
the agent could never reach. Since the skill exists precisely to catch an agent
about to hand-roll a dropdown or install an abandoned package, it can't do that
job if only a human can start it. The flag is dropped here, so the pointer in
`animate` resolves.

Its description changed with the flag, because the old one ended "Only runs
when explicitly invoked; it does not trigger on its own" — an instruction that
would have suppressed the very invocation the flag removal enables. It now
carries real trigger conditions instead: before adding a frontend dependency,
and before hand-rolling a toast, dropdown, dialog, command palette, or
virtualized list.

Every other file is byte-identical to upstream, `animate` included.

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

### From obra/superpowers

`using-git-worktrees` and `finishing-a-development-branch`, taken from
[obra/superpowers](https://github.com/obra/superpowers) at `6.3.0`. They close
the one real hole in the main flow: `/implement` ended at "commit to the
current branch" and nothing said what happened to the branch after that. Both
are wired into `/implement` — the first opens the branch lifecycle, the second
closes it.

**Rewritten, not copied.** Unlike the emilkowalski set, no file here is
upstream's. Superpowers builds every skill around prohibition — a "Common
Rationalizations" table, a "Red Flags — STOP" list, an "Iron Law" — and
[`writing-for-agents`](skills/writing-for-agents/SKILL.md) names that exact
technique as a failure mode: steering by prohibition drags the forbidden
behaviour into context and makes it *more* available, not less. Copying these
verbatim would have imported an anti-pattern this repo documents against. Each
rationalization row was checked instead: the ones restating a step already
present were dropped, and the ones carrying a real guardrail (`--force` on a
refused worktree removal, force-pushing over a moved remote) were kept as
prohibitions paired with the positive target, which is the escape hatch
`writing-for-agents` allows. Both came out shorter — 167 → 94 lines, and
225 → 169, where the length is genuine stepwise procedure.

**Also changed:** upstream's second-person register ("your human partner",
9 occurrences across the two) is addressed to the user directly here, and
`finishing-a-development-branch` no longer identifies worktrees it may clean by
asking whether *Superpowers* made them — it points at `using-git-worktrees` and
the `.worktrees/` convention instead.

**Absorbed rather than vendored:** two more superpowers skills earned their
content a home but not a file of their own.
`verification-before-completion` became the *Claim on evidence* subsection of
[`karpathy-guidelines`](skills/karpathy-guidelines/SKILL.md), whose §4 already
owned success criteria and lacked only the gate on asserting one is met.
`dispatching-parallel-agents` became the subagent guidance under option 4 of
[`PHASE-BOUNDARIES.md`](skills/ask-matt/PHASE-BOUNDARIES.md), which already
owned *when* to reach for a subagent and needed only the *how*. Both were 120+
line files whose unique content was a dozen lines.

**Not taken:** `receiving-code-review`. The gap is real — `code-review` and
`scrutinize` both produce findings and nothing here governs reacting to them —
but the file is 13 sections of mostly style prohibition ("❌ ANY gratitude
expression"), it hard-codes another maintainer's stated preferences as
doctrine, and the harness already covers the substance. The two load-bearing
rules — verify a suggestion against this codebase before implementing it, and
clarify every unclear item before starting any of them — are worth a short
skill written here, not a vendoring. The other nine superpowers skills all
duplicate something this repo already does better.
