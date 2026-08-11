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

Wire it into one of:

- **Global `SessionStart` hook**, in `~/.claude/settings.json` — runs at the
  start of every session in that environment, whichever repo is open. This is
  the one you want: the briefing has to be re-emitted per session, so a
  once-per-container setup script can't deliver it.

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

  No `$CLAUDE_CODE_REMOTE` guard needed — the script checks that itself, and
  skips only the install step when run locally, so a local machine still gets
  the briefing for its symlinked skills.

- **Environment setup script** (Claude Code on the web → environment
  settings) — runs once when the container is provisioned. Use
  `scripts/install-skills.sh` here if you want the skills present before the
  first session starts; it does not replace the hook, since only the hook can
  brief each session.

This repo also ships `.claude/settings.json`, so sessions opened on *this*
repo run the hook from the checkout without touching the network.

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

- **ask-matt** — router over the skills in this repo; ask which skill or flow fits your situation.
- **batch-grill-me** — relentless interview that asks every frontier question at once, round by round.
- **code-review** — two-axis review (standards + spec) of a diff since a fixed point, via parallel sub-agents.
- **codebase-design** — shared vocabulary and principles for designing deep modules.
- **diagnosing-bugs** — disciplined loop for hard bugs: build a feedback loop, reproduce, hypothesise, instrument, fix.
- **domain-modeling** — build and sharpen a project's domain model (glossary, ADRs).
- **grill-me** — thin `/grilling` alias, user-invoked only.
- **grill-with-docs** — `/grilling` session that also produces ADRs and glossary via `domain-modeling`.
- **grilling** — relentless interview to stress-test a plan or design.
- **handoff** — compact the current conversation into a handoff doc for another agent.
- **implement** — implement a spec/tickets using TDD, typechecking, and code review.
- **improve-codebase-architecture** — scan for deepening opportunities, present as an HTML report, then grill through the pick.
- **karpathy-guidelines** — behavioral guidelines to reduce common LLM coding mistakes.
- **prototype** — build throwaway prototypes to answer a design or UI question.
- **research** — delegate primary-source research to a background agent, captured as a Markdown file.
- **resolving-merge-conflicts** — resolve an in-progress git merge/rebase conflict, preserving intent on both sides.
- **scrutinize** — outsider-perspective end-to-end review of a plan/PR/code change.
- **setup-matt-pocock-skills** — one-time per-repo config: issue tracker, triage labels, domain-doc layout.
- **tdd** — red-green-refactor reference: what a good test is, seams, anti-patterns, loop rules.
- **teach** — multi-session teaching workflow with HTML lessons and learning records.
- **to-spec** — turn the current conversation into a spec/PRD and publish it to the issue tracker.
- **to-tickets** — break a plan/spec into tracer-bullet tickets with declared blocking edges.
- **triage** — move issues and external PRs through a state machine of triage roles.
- **wayfinder** — plan a huge effort as a shared map of decision tickets, resolved one at a time.
- **writing-great-skills** — reference for writing and editing skills well.
