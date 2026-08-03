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

## Skills

- **batch-grill-me** — relentless interview that asks every frontier question at once, round by round.
- **domain-modeling** — build and sharpen a project's domain model (glossary, ADRs).
- **grill-me** — thin `/grilling` alias, user-invoked only.
- **grill-with-docs** — `/grilling` session that also produces ADRs and glossary via `domain-modeling`.
- **grilling** — relentless interview to stress-test a plan or design.
- **handoff** — compact the current conversation into a handoff doc for another agent.
- **karpathy-guidelines** — behavioral guidelines to reduce common LLM coding mistakes.
- **scrutinize** — outsider-perspective end-to-end review of a plan/PR/code change.
- **teach** — multi-session teaching workflow with HTML lessons and learning records.
- **writing-great-skills** — reference for writing and editing skills well.
