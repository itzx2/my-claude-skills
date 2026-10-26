# my-claude-skills

Personal Claude Code skills, synced across devices.

## Install on a new machine

This repo is a Claude Code plugin marketplace. Install it:

```sh
claude plugin marketplace add https://github.com/itzx2/my-claude-skills.git
claude plugin install my-claude-skills@my-claude-skills
claude plugin install savvy-progress@my-claude-skills
claude plugin install my-roblox-skills@my-claude-skills   # only if you build Roblox games
```

That installs at **user scope**, so the skills load in every session in every
directory, and the SessionStart briefing (below) ships with it. Restart Claude
Code afterwards — skills are enumerated once, at session start.

No clone, no symlink, no Administrator shell on Windows. Update later with
`claude plugin update my-claude-skills`.

The marketplace holds three plugins:

Each marketplace entry points to its own folder under `plugins/`. The main
plugin's release folder is generated from the development sources; it contains
one root manifest and excludes the sibling mod. This avoids the nested-manifest
ambiguity seen in Claude's marketplace importer. See
[marketplace packaging](docs/marketplace-packaging.md) for regeneration and checks.

- **`my-claude-skills`** — the skills, the briefing, and the **subagent git
  guard**: a `PreToolUse` hook that stops *subagents* (never the main session)
  from running `git push`, `git clean -f`, `git branch -D`, or
  `git checkout .` / `git restore .`. Claude Code marks a subagent's tool calls
  with `agent_id`, which is how the hook tells them apart. `reset --hard` stays
  allowed, because `implement-spec`'s implementers reset their own worktrees.
- **`savvy-progress`** — a mod: an agents panel showing every subagent's
  model, effort, context, cost and time, and a **Subagents** band above the
  prompt whose `×N` button reopens the panel after you close it
  (`/agents-info` toggles it too). It is a separate plugin because mods use an
  early-access API that older Claude Code versions reject, and a refusal
  should cost only the panel — see [`docs/adr/0005`](docs/adr/0005-the-progress-mod-ships-as-its-own-plugin.md).

  The mod also registers two tools, `progress` (a planned-task bar) and
  `step` (per-step progress on each subagent's row), and `chief-of-staff` and
  `implement-spec` call them when present. **The desktop app does not hand
  them to the model** — tested on 2.1.299, both hot-reloaded and loaded at
  session start — so there those features are absent and the skills skip
  them silently. The panel and the band do not depend on them.
- **`my-roblox-skills`** — the 29 Roblox domain skills from
  [TabooHarmony/roblox-brain](https://github.com/TabooHarmony/roblox-brain),
  the **`/my-roblox-skills:ask-roblox`** router, and a **Roblox briefing**
  injected at session start and into every subagent: the full route in a
  folder that looks like a Roblox project (Rojo, Wally, pesde, Rokit, saved
  places, `.luau` sources), a short pointer anywhere else. Install it only
  where you build Roblox games; it does not need `my-claude-skills`, and works
  beside it. See [its README](plugins/my-roblox-skills/README.md) and
  [`docs/adr/0006`](docs/adr/0006-roblox-skills-ship-as-their-own-plugin.md).

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

At session start it walks **this plugin only**: the `skills/` *and*
`commands/` directories of the folder it ships in, found from the script's own
location. Each plugin briefs its own skills — `my-roblox-skills` ships its own
Roblox briefing — so no briefing restates another's, and a plugin's briefing
says nothing about plugins that are not installed with it. In the legacy
loose install, where `install-skills.sh` copies the script to
`~/.claude/briefing.js`, there is no plugin manifest above it, so it briefs
`~/.claude/skills` instead, with bare names.

The skills walk **recurses**, because a plugin may group skills in container
directories. A directory holding `SKILL.md` is a skill and is never descended
into; anything else is a container and is walked. Nesting never contributes to
the name: only the plugin's identity creates a prefix. (Commands are the
deliberate exception — `commands/foo/bar.md` really is `foo:bar`.)

then emits a `SessionStart` `additionalContext` payload splitting them into:

- **Model-invocable** — a compact roster, as a recall aid, with a nudge to reach
  for a matching skill instead of improvising.
- **User-invoked only** — name and full description for each, plus instructions
  to recommend rather than invoke them.

Both directories matter: a plugin can ship behaviour as a skill (a directory
with `SKILL.md`) or a command (a single `.md` file), and Claude Code lists both.

Each entry carries its exact invocation, `plugin:` prefix included, since that
is the one thing the agent cannot reconstruct on its own.

The roster also states what it *cannot* see: everything outside this plugin.
Other plugins brief their own, and loose and harness-supplied skills are in the
agent's Skill listing, so an absent name never means an absent skill.

Three scripts check it, and all exit non-zero on failure:

```sh
bash scripts/test-briefing.sh      # fixture tests for the walk itself
bash scripts/test-install-race.sh  # two installs at once stay correct
bash scripts/verify-install.sh     # is every skill in skills/ reachable right now?
```

`test-briefing.sh` builds throwaway plugin folders — with skills, commands, a
nested container, and other plugins, loose skills and project skills beside
them — and asserts the rendered roster holds the plugin's own skills and
nothing else. Every bug it guards against is a silent one: a wrong walk still
emits a plausible roster, just short. That is how the old `synced/` gap
survived unnoticed.

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

The briefing covers its own plugin only. A hidden skill in another plugin, or
loose in `~/.claude/skills`, is briefed by nothing here: that plugin's own
briefing has to carry it, as `my-roblox-skills` does for `ask-roblox`. Model-
invocable skills from anywhere, including the harness and claude.ai-managed
plugins, are in the agent's Skill listing, which is why `ask-matt` reads both.

## Skills

46 skills in `my-claude-skills`. The Roblox skills are listed in [the `my-roblox-skills` README](plugins/my-roblox-skills/README.md). `/name` marks the ones Claude Code hides from the agent (`disable-model-invocation`), which only you can trigger — the rest the agent may invoke itself. This list is written by hand; the per-session briefing is generated from front matter and needs no edit here.

The leading `/` below is a **marker for that distinction, not the invocation**. Installed as a plugin, every name here is prefixed: `/my-claude-skills:to-spec`, `my-claude-skills:grilling`, and so on. Only the legacy symlink install leaves them bare.

Forty-three of them are **vendored** — copied in from another repo rather than installed beside this one, so they ride the same install-and-brief path as everything else. Marked ⬇ below: thirty-three engineering and productivity skills from [mattpocock/skills](https://github.com/mattpocock/skills), eight design-engineering skills (animation and interface craft) from [emilkowalski/skills](https://github.com/emilkowalski/skills), and two branch-lifecycle skills from [obra/superpowers](https://github.com/obra/superpowers). The twenty-nine Roblox skills from [TabooHarmony/roblox-brain](https://github.com/TabooHarmony/roblox-brain) ship in the separate `my-roblox-skills` plugin. [`vendor/record.json`](vendor/record.json) says which upstream, pin and status each one has; see [Vendored skills](#vendored-skills) for what changed on the way in.

- **animate** ⬇ — build an animation from scratch, making the decisions in the order that determines whether it feels right — should it animate at all, what purpose, which tool, which properties, which curve and duration, how it interrupts, how it exits.
- **animation-vocabulary** ⬇ — reverse-lookup glossary that turns a vague description of a web animation or motion effect into its exact term ("the bouncy thing when a popover opens" → Pop in).
- **apple-design** ⬇ — Apple's approach to interface design and fluid, physical motion, translated for the web.
- **/ask-matt** ⬇ — ask which skill or flow fits your situation. Forked: it routes this plugin's whole roster, not just Matt's.
- **/chief-of-staff** ⬇ — pursue a long-running goal in a single session by co-ordinating subagents.
- **/claude-handoff** ⬇ — hand the current conversation off to a fresh background agent that picks up the work immediately. Deliberately *not* aligned with `/handoff`: it seeds an agent's prompt rather than writing a file, so none of the live-brief rules apply to it.
- **code-review** ⬇ — review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?).
- **codebase-design** ⬇ — shared vocabulary for designing deep modules.
- **diagnosing-bugs** ⬇ — diagnosis loop for hard bugs and performance regressions.
- **domain-modeling** ⬇ — build and sharpen a project's domain model.
- **emil-design-eng** ⬇ — Emil Kowalski's philosophy on UI polish, component design, animation decisions, and the invisible details that make software feel great.
- **find-animation-opportunities** ⬇ — search a codebase or UI for places that don't animate but should, and reject everything that shouldn't.
- **finishing-a-development-branch** ⬇ — decide how finished work gets integrated — merge locally, open a PR, or keep the branch — then execute that choice and clean up the workspace.
- **/grill-me** ⬇ — a relentless interview to sharpen a plan or design.
- **/grill-with-docs** ⬇ — a relentless interview to sharpen a plan or design, which also creates docs (ADRs and glossary) as we go.
- **grilling** ⬇ — grill the user relentlessly about a plan, decision, or idea.
- **/handoff** ⬇ — compact the current conversation into a handoff document for another agent to pick up. Forked: the live-brief system, nothing like upstream's.
- **/implement** ⬇ — implement a piece of work based on a spec or set of tickets.
- **/implement-spec** ⬇ — implement a whole spec on one integration branch, running implementer subagents across the tickets' ready frontier in parallel.
- **improve-animations** ⬇ — survey a codebase's animation and motion code, then produce a prioritized audit and self-contained implementation plans for other agents (or cheaper models) to execute.
- **/improve-codebase-architecture** ⬇ — scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
- **karpathy-guidelines** — behavioral guidelines to reduce common LLM coding mistakes.
- **/loop-me** ⬇ — grill me about specs for the workflows I want to build, within this workspace.
- **pick-ui-library** ⬇ — pick the right library for a given frontend task from a curated, opinionated list — toasts, UI primitives, command menus, charts, virtualization, drag and drop, animated numbers, OTP inputs, state, styling.
- **pr** ⬇ — write a PR body built for fast human review: the smallest visual that shows the change, before/after evidence, and a one-way or two-way door call.
- **/project-brain** — scaffold a project's `AGENTS.md` router and domain model so any agent can orient cold.
- **prototype** ⬇ — build a throwaway prototype to answer a design question.
- **research** ⬇ — investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo.
- **/retro** ⬇ — look back over a coding session and suggest changes to the agent's environment: checks, coding standards, steering files.
- **/review-animations** ⬇ — review animation and motion code against a high craft bar; default to flagging, approval is earned.
- **/software-factory** ⬇ — experimental shared language for designing an agent factory: its tasks, triggers, services, review gates, and human intervention. Includes five supporting reference documents.
- **scrutinize** — outsider-perspective end-to-end review of a plan, PR, or code change.
- **/setup-matt-pocock-skills** ⬇ — configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, and domain doc layout.
- **setup-pre-commit** ⬇ — set up Husky pre-commit hooks with lint-staged, type checking and tests in a JS/TS repo.
- **/setup-ts-deep-modules** ⬇ — wire dependency-cruiser into a TypeScript repo so each package is a deep module, reachable only through its entry points.
- **tdd** ⬇ — test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
- **/teach** ⬇ — teach the user a new skill or concept, within this workspace.
- **/to-questionnaire** ⬇ — turn a decision you can't fully answer into a questionnaire for someone else to fill in.
- **/to-spec** ⬇ — turn the current conversation into a spec and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed.
- **/to-tickets** ⬇ — break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker.
- **/triage** ⬇ — move issues and external PRs through a state machine of triage roles — categorise, verify, grill if needed, and write agent-ready briefs.
- **using-git-worktrees** ⬇ — set up an isolated workspace on a green baseline, so feature work leaves the current checkout untouched.
- **/wait-what** ⬇ — stop. That last message did not land — re-pitch it.
- **/wayfinder** ⬇ — plan a huge chunk of work — more than one agent session can hold — as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
- **wizard** ⬇ — generate an interactive bash wizard that walks a human through steps only they can perform.
- **writing-for-agents** ⬇ — writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md.

## Vendored skills

Ask Matt sends Roblox requests to `/my-roblox-skills:ask-roblox`, the router in the `my-roblox-skills` plugin, when that plugin is installed.

### Skill sources

This catalog lists every shipped vendored skill and plugin, with its local
status and an immutable link to its upstream source. Local forks may differ
substantially from that source. Skipped entries are not shipped; absorbed
material is listed separately below. The three skills no upstream sync covers are
`karpathy-guidelines` (started from Forrest Chang's, see [Credits](#credits-and-licenses)), `project-brain`, and `scrutinize`.

The catalog is generated from `vendor/record.json` with
`node scripts/vendor-catalog.js generate` and checked before publishing.

<!-- vendor-catalog:start -->

#### [mattpocock/skills](https://github.com/mattpocock/skills) — 33 entries

Pin: [`b59cab4`](https://github.com/mattpocock/skills/commit/b59cab42bf1206e1363eafc37f71b21c3bcaa12f). Links point to the pinned source, including the original source of locally maintained forks.

| Skill or plugin | Local status | Skill source |
| --- | --- | --- |
| [ask-matt](skills/ask-matt) | forked | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/ask-matt/SKILL.md) |
| [chief-of-staff](skills/chief-of-staff) | patched | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/in-progress/chief-of-staff/SKILL.md) |
| [claude-handoff](skills/claude-handoff) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/in-progress/claude-handoff/SKILL.md) |
| [code-review](skills/code-review) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/code-review/SKILL.md) |
| [codebase-design](skills/codebase-design) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/codebase-design/SKILL.md) |
| [diagnosing-bugs](skills/diagnosing-bugs) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/diagnosing-bugs/SKILL.md) |
| [domain-modeling](skills/domain-modeling) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/domain-modeling/SKILL.md) |
| [grill-me](skills/grill-me) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/productivity/grill-me/SKILL.md) |
| [grill-with-docs](skills/grill-with-docs) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/grill-with-docs/SKILL.md) |
| [grilling](skills/grilling) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/productivity/grilling/SKILL.md) |
| [handoff](skills/handoff) | forked | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/productivity/handoff/SKILL.md) |
| [implement](skills/implement) | patched | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/implement/SKILL.md) |
| [implement-spec](skills/implement-spec) | patched | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/implement-spec/SKILL.md) |
| [improve-codebase-architecture](skills/improve-codebase-architecture) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/improve-codebase-architecture/SKILL.md) |
| [loop-me](skills/loop-me) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/in-progress/loop-me/SKILL.md) |
| [pr](skills/pr) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/pr/SKILL.md) |
| [prototype](skills/prototype) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/prototype/SKILL.md) |
| [research](skills/research) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/research/SKILL.md) |
| [retro](skills/retro) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/retro/SKILL.md) |
| [setup-matt-pocock-skills](skills/setup-matt-pocock-skills) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/setup-matt-pocock-skills/SKILL.md) |
| [setup-pre-commit](skills/setup-pre-commit) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/misc/setup-pre-commit/SKILL.md) |
| [setup-ts-deep-modules](skills/setup-ts-deep-modules) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/in-progress/setup-ts-deep-modules/SKILL.md) |
| [software-factory](skills/software-factory) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/in-progress/software-factory/SKILL.md) |
| [tdd](skills/tdd) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/tdd/SKILL.md) |
| [teach](skills/teach) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/productivity/teach/SKILL.md) |
| [to-questionnaire](skills/to-questionnaire) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/productivity/to-questionnaire/SKILL.md) |
| [to-spec](skills/to-spec) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/to-spec/SKILL.md) |
| [to-tickets](skills/to-tickets) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/to-tickets/SKILL.md) |
| [triage](skills/triage) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/triage/SKILL.md) |
| [wait-what](skills/wait-what) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/productivity/wait-what/SKILL.md) |
| [wayfinder](skills/wayfinder) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/wayfinder/SKILL.md) |
| [wizard](skills/wizard) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/engineering/wizard/SKILL.md) |
| [writing-for-agents](skills/writing-for-agents) | verbatim | [SKILL.md](https://github.com/mattpocock/skills/blob/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/productivity/writing-for-agents/SKILL.md) |

#### [emilkowalski/skills](https://github.com/emilkowalski/skills) — 8 entries

Pin: [`78761e1`](https://github.com/emilkowalski/skills/commit/78761e1b57f97dce65b983d640c70a68f39e8163). Links point to the pinned source, including the original source of locally maintained forks.

| Skill or plugin | Local status | Skill source |
| --- | --- | --- |
| [animate](skills/animate) | verbatim | [SKILL.md](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/animate/SKILL.md) |
| [animation-vocabulary](skills/animation-vocabulary) | verbatim | [SKILL.md](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/animation-vocabulary/SKILL.md) |
| [apple-design](skills/apple-design) | verbatim | [SKILL.md](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/apple-design/SKILL.md) |
| [emil-design-eng](skills/emil-design-eng) | verbatim | [SKILL.md](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/emil-design-eng/SKILL.md) |
| [find-animation-opportunities](skills/find-animation-opportunities) | verbatim | [SKILL.md](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/find-animation-opportunities/SKILL.md) |
| [improve-animations](skills/improve-animations) | verbatim | [SKILL.md](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/improve-animations/SKILL.md) |
| [pick-ui-library](skills/pick-ui-library) | patched | [SKILL.md](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/pick-ui-library/SKILL.md) |
| [review-animations](skills/review-animations) | verbatim | [SKILL.md](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/review-animations/SKILL.md) |

#### [obra/superpowers](https://github.com/obra/superpowers) — 2 entries

Pin: [`b36e082`](https://github.com/obra/superpowers/commit/b36e0829c6d0140e93cfef2ca599b1b07d4a7797). Links point to the pinned source, including the original source of locally maintained forks.

| Skill or plugin | Local status | Skill source |
| --- | --- | --- |
| [finishing-a-development-branch](skills/finishing-a-development-branch) | forked | [SKILL.md](https://github.com/obra/superpowers/blob/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/finishing-a-development-branch/SKILL.md) |
| [using-git-worktrees](skills/using-git-worktrees) | forked | [SKILL.md](https://github.com/obra/superpowers/blob/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/using-git-worktrees/SKILL.md) |

#### [JohnnyVizz/claude-kit](https://github.com/JohnnyVizz/claude-kit) — 1 entries

Pin: [`c871c15`](https://github.com/JohnnyVizz/claude-kit/commit/c871c153ead54ad9547cc717d0f3e5a676c73986). Links point to the pinned source, including the original source of locally maintained forks.

| Skill or plugin | Local status | Skill source |
| --- | --- | --- |
| [savvy-progress](plugins/savvy-progress) | patched | [plugin folder](https://github.com/JohnnyVizz/claude-kit/tree/c871c153ead54ad9547cc717d0f3e5a676c73986/plugins/savvy-progress) |

#### [TabooHarmony/roblox-brain](https://github.com/TabooHarmony/roblox-brain) — 29 entries

Pin: [`ceee4aa`](https://github.com/TabooHarmony/roblox-brain/commit/ceee4aaa5004502e2a51d78b3c33bba44d84742b). Links point to the pinned source, including the original source of locally maintained forks.

| Skill or plugin | Local status | Skill source |
| --- | --- | --- |
| [roblox-analytics](plugins/my-roblox-skills/skills/roblox-analytics) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/design/roblox-analytics/SKILL.md) |
| [roblox-animation-vfx](plugins/my-roblox-skills/skills/roblox-animation-vfx) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-animation-vfx/SKILL.md) |
| [roblox-architecture](plugins/my-roblox-skills/skills/roblox-architecture) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-architecture/SKILL.md) |
| [roblox-audio](plugins/my-roblox-skills/skills/roblox-audio) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-audio/SKILL.md) |
| [roblox-building](plugins/my-roblox-skills/skills/roblox-building) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-building/SKILL.md) |
| [roblox-camera](plugins/my-roblox-skills/skills/roblox-camera) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-camera/SKILL.md) |
| [roblox-cloud](plugins/my-roblox-skills/skills/roblox-cloud) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/tools/roblox-cloud/SKILL.md) |
| [roblox-collaboration-mode](plugins/my-roblox-skills/skills/roblox-collaboration-mode) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-collaboration-mode/SKILL.md) |
| [roblox-data](plugins/my-roblox-skills/skills/roblox-data) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-data/SKILL.md) |
| [roblox-game-design](plugins/my-roblox-skills/skills/roblox-game-design) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/design/roblox-game-design/SKILL.md) |
| [roblox-growth-design](plugins/my-roblox-skills/skills/roblox-growth-design) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/design/roblox-growth-design/SKILL.md) |
| [roblox-gui](plugins/my-roblox-skills/skills/roblox-gui) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-gui/SKILL.md) |
| [roblox-input](plugins/my-roblox-skills/skills/roblox-input) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-input/SKILL.md) |
| [roblox-lighting](plugins/my-roblox-skills/skills/roblox-lighting) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-lighting/SKILL.md) |
| [roblox-localization](plugins/my-roblox-skills/skills/roblox-localization) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-localization/SKILL.md) |
| [roblox-luau-core](plugins/my-roblox-skills/skills/roblox-luau-core) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-luau-core/SKILL.md) |
| [roblox-luau-patterns](plugins/my-roblox-skills/skills/roblox-luau-patterns) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-luau-patterns/SKILL.md) |
| [roblox-luau-types](plugins/my-roblox-skills/skills/roblox-luau-types) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-luau-types/SKILL.md) |
| [roblox-monetization](plugins/my-roblox-skills/skills/roblox-monetization) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/design/roblox-monetization/SKILL.md) |
| [roblox-networking](plugins/my-roblox-skills/skills/roblox-networking) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-networking/SKILL.md) |
| [roblox-npc-ai](plugins/my-roblox-skills/skills/roblox-npc-ai) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-npc-ai/SKILL.md) |
| [roblox-performance](plugins/my-roblox-skills/skills/roblox-performance) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-performance/SKILL.md) |
| [roblox-physics](plugins/my-roblox-skills/skills/roblox-physics) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/gameplay/roblox-physics/SKILL.md) |
| [roblox-player-psychology](plugins/my-roblox-skills/skills/roblox-player-psychology) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/design/roblox-player-psychology/SKILL.md) |
| [roblox-publish-checklist](plugins/my-roblox-skills/skills/roblox-publish-checklist) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/tools/roblox-publish-checklist/SKILL.md) |
| [roblox-security](plugins/my-roblox-skills/skills/roblox-security) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-security/SKILL.md) |
| [roblox-server-data](plugins/my-roblox-skills/skills/roblox-server-data) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/core/roblox-server-data/SKILL.md) |
| [roblox-studio-mcp](plugins/my-roblox-skills/skills/roblox-studio-mcp) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/tools/roblox-studio-mcp/SKILL.md) |
| [roblox-tooling](plugins/my-roblox-skills/skills/roblox-tooling) | verbatim | [SKILL.md](https://github.com/TabooHarmony/roblox-brain/blob/ceee4aaa5004502e2a51d78b3c33bba44d84742b/skills/tools/roblox-tooling/SKILL.md) |

#### Absorbed upstream material

These are not separately installed skills.

| Upstream entry | Local home | Source |
| --- | --- | --- |
| git-guardrails-claude-code | [hooks/subagent-git-guard.js](hooks/subagent-git-guard.js), [hooks/hooks.json](hooks/hooks.json) | [upstream source](https://github.com/mattpocock/skills/tree/b59cab42bf1206e1363eafc37f71b21c3bcaa12f/skills/misc/git-guardrails-claude-code) |
| verification-before-completion | [skills/karpathy-guidelines/SKILL.md](skills/karpathy-guidelines/SKILL.md) | [upstream source](https://github.com/obra/superpowers/tree/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/verification-before-completion) |
| dispatching-parallel-agents | [skills/ask-matt/PHASE-BOUNDARIES.md](skills/ask-matt/PHASE-BOUNDARIES.md) | [upstream source](https://github.com/obra/superpowers/tree/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/dispatching-parallel-agents) |

<!-- vendor-catalog:end -->

### Vendoring approach

Five upstreams, vendored on different terms. Matt's engineering set and the
design-engineering set are copied verbatim apart from recorded patches; the
branch-lifecycle pair was rewritten on the way in, for the reason recorded under
its own heading; and one plugin, `savvy-progress`, comes from
[JohnnyVizz/claude-kit](https://github.com/JohnnyVizz/claude-kit) at `c871c15`
with two patches — its agents panel opens whenever any subagent starts, not
only savvy-flow's workers, and any subagent launch starts the Subagents band
that carries the panel's reopen button, which upstream draws only once its
`progress` tool has been called. savvy-flow itself is not taken: its review gate and its
per-task model and effort are patched into `chief-of-staff` instead, and
`implement-spec` already covers ticket orchestration.

[`vendor/record.json`](vendor/record.json) is the **vendor record**: each
upstream's repo and pin, and every entry's status — verbatim, patched, forked,
absorbed or skipped — with the purpose of each patch and a check that proves it
landed. `node scripts/vendor.js check` verifies the whole record against the
pins (verbatim files byte for byte, patches by their checks) and fails loudly.
A sync is run by an agent through the repo-local
[`sync-upstream`](.claude/skills/sync-upstream/SKILL.md) skill; why it works
this way is in [`docs/adr/0003`](docs/adr/0003-vendored-skills-are-synced-from-a-record.md).

### From mattpocock/skills

Thirty-three skills, pinned at `b59cab4` on `software-factory-skill` (2026-10-22).
This includes `main` at `5beb35b`, which adds the dated, commit-cited wiki to
`chief-of-staff`, plus the experimental `software-factory` skill and all five
supporting documents. The previous pin was `49dd158`.

**Skill references are rewritten on the way in.** Matt's skills call each
other by short name (`call the Skill tool with "tdd"`), and a short name is not
reliable inside a plugin: the Skill tool resolves `karpathy-guidelines` but
answers "Unknown skill" for `prototype`, which clashes with a hidden Claude
Code built-in. Every reference becomes its full invocation
(`"my-claude-skills:tdd"`, `/my-claude-skills:to-spec`), mechanically, so a
verbatim skill differs from upstream only by that rewrite.

**Patched:** `implement` gets the branch lifecycle back —
`using-git-worktrees` before starting, `finishing-a-development-branch` after
committing. `chief-of-staff` gets savvy-flow's discipline: a five-level ladder
for picking each subagent's model and effort, a review gate (read the diff,
accept or return with defects, two returns at most), and progress reporting
to `savvy-progress`. `implement-spec` gets the progress reporting only; its
quality comes from `tdd` per ticket and one `code-review` at the end, as
upstream designed it.

**Forked:** `ask-matt` routes this plugin's whole roster, so his new routes are
merged into it by hand each sync. `handoff` is the live-brief system and shares
nothing with upstream's temp-directory handoff.

**Taken from outside his plugin:** `chief-of-staff`, `claude-handoff`,
`loop-me`, `setup-ts-deep-modules` and `software-factory` (experimental upstream), and
`setup-pre-commit` (frozen upstream).

**Absorbed:** `git-guardrails-claude-code` became the subagent git guard in
`hooks/subagent-git-guard.js` — rewritten in Node, because upstream's bash
script needs `jq` and, without it, silently allows everything; narrowed to
subagents; and always on, so no repo needs setting up.

**Not taken:** `writing-beats`, `writing-fragments`, `writing-shape`,
`migrate-to-shoehorn` and `scaffold-exercises`. `resolving-merge-conflicts` and
`batch-grill-me` were dropped here after upstream removed them.

**Following upstream's rename:** the domain glossary is `GLOSSARY.md`, not
`CONTEXT.md` — see [`docs/adr/0004`](docs/adr/0004-follow-upstream-to-glossary-md.md).

### From TabooHarmony/roblox-brain

All 29 complete skill folders ship in the `my-roblox-skills` plugin, under [`plugins/my-roblox-skills/skills/`](plugins/my-roblox-skills/skills), vendored unchanged from [v2.3.1 at `ceee4aa`](https://github.com/TabooHarmony/roblox-brain/tree/ceee4aaa5004502e2a51d78b3c33bba44d84742b). The vendor record marks every Brain entry as verbatim, including collaboration-mode and player-psychology. The earlier six-skill adaptations and namespace rewriting are removed at the user's direction. Upstream examples and advice are carried as-is; review observations remain research, not local patches.

The upstream MIT license is preserved byte-for-byte at [`plugins/my-roblox-skills/licenses/roblox-brain-LICENSE`](plugins/my-roblox-skills/licenses/roblox-brain-LICENSE), inside the plugin so every install carries it. All sibling skills and their `references/full.md` resources are included; no Brain skill sets `disable-model-invocation: true`.

**Dependencies:** Loading the skills requires no extra packages. Live operations depend on the host's actual tools: Studio/MCP for Studio work, shell/Git for repository workflows, and configured Open Cloud access for cloud operations. ProfileStore, UI frameworks, Rojo and other project libraries/tools remain conditional choices described by upstream, not mandatory plugin installs. Upstream Python/PyYAML/Luau tools are its CI dependencies, not runtime requirements for these Markdown skills. See [`docs/roblox-brain-full-adoption.md`](docs/roblox-brain-full-adoption.md) for exact payload verification and host limits.

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

## Credits and licenses

Most of what ships here was written by other people. Every upstream below is
MIT-licensed, and MIT asks for one thing in return: keep the copyright and
permission notice with every copy. Each license is kept byte-for-byte as it
stood at the pinned commit, inside the plugin folder that ships the copied
work, because a plugin install copies only that folder.

| Upstream | Author | What we use | License copy |
| --- | --- | --- | --- |
| [mattpocock/skills](https://github.com/mattpocock/skills) | Matt Pocock | 33 engineering and productivity skills, including `ask-matt`, `grill-with-docs`, `tdd`, `chief-of-staff` and `software-factory` | [`vendor/licenses/mattpocock-LICENSE`](vendor/licenses/mattpocock-LICENSE) |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | Emil Kowalski | 8 animation and interface-craft skills | [`vendor/licenses/emilkowalski-LICENSE`](vendor/licenses/emilkowalski-LICENSE) |
| [obra/superpowers](https://github.com/obra/superpowers) | Jesse Vincent | `using-git-worktrees` and `finishing-a-development-branch` (rewritten), and material absorbed into `karpathy-guidelines` and `ask-matt` | [`vendor/licenses/superpowers-LICENSE`](vendor/licenses/superpowers-LICENSE) |
| [JohnnyVizz/claude-kit](https://github.com/JohnnyVizz/claude-kit) | johnnyvizz | the `savvy-progress` mod, patched | [`plugins/savvy-progress/LICENSE`](plugins/savvy-progress/LICENSE), also [`vendor/licenses/claude-kit-LICENSE`](vendor/licenses/claude-kit-LICENSE) |
| [TabooHarmony/roblox-brain](https://github.com/TabooHarmony/roblox-brain) | TabooHarmony | all 29 Roblox domain skills, unchanged, and the domain structure `ask-roblox` routes by | [`plugins/my-roblox-skills/licenses/roblox-brain-LICENSE`](plugins/my-roblox-skills/licenses/roblox-brain-LICENSE) |
| [forrestchang/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) (now under multica-ai) | Forrest Chang | `karpathy-guidelines`, extended here with a *Claim on evidence* subsection; it distils [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding | declared `license: MIT` in the skill's own front matter, which travels with it; the repo has no separate LICENSE file |

`project-brain` and `scrutinize` are original to this repo.
[`vendor/record.json`](vendor/record.json) records each synced upstream's pin,
license and the status of every copied skill, and the
[Skill sources](#skill-sources) catalog links each one to its pinned original.

None of these authors endorses this repo. If you are one of them and want
something changed or removed, open an issue.
