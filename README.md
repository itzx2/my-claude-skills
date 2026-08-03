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

`scripts/install-skills.sh` sparse-clones this repo over plain public HTTPS
and mirrors `skills/` into `~/.claude/skills`. It needs nothing but outbound
HTTPS — no GitHub App / repo-source access — so it works even in
environments that don't have this repo attached as a source.

Run it directly:

```sh
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/install-skills.sh | bash
```

To have it run automatically, wire that command into one of:

- **Environment setup script** (Claude Code on the web → environment
  settings) — runs once when the environment container is provisioned,
  before any session starts, regardless of which repo is opened.
- **Global `SessionStart` hook**, in `~/.claude/settings.json`, so it runs
  at the start of every session in that environment. Gate it on
  `$CLAUDE_CODE_REMOTE` so it's a no-op on a local machine (where you'd use
  the symlink method above instead):

  ```json
  {
    "hooks": {
      "SessionStart": [
        {
          "hooks": [
            {
              "type": "command",
              "command": "if [ \"${CLAUDE_CODE_REMOTE:-}\" = \"true\" ]; then curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/install-skills.sh | bash; fi"
            }
          ]
        }
      ]
    }
  }
  ```

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
