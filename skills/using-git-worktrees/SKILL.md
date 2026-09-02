---
name: using-git-worktrees
description: Set up an isolated workspace so feature work leaves the current checkout untouched. Use before /implement, before executing a plan, or when work needs isolating from what is checked out now.
---

# Using Git Worktrees

Work happens in an **isolated** workspace, so the checkout you are sitting in keeps its state. Detect the isolation you may already have, reach for the harness's native tool, and fall back to `git worktree` only when there is none.

## 1. Detect existing isolation

Run these every time. Harness-created isolation and submodules both look like a normal repo from the outside; the commands settle it.

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
git rev-parse --show-superproject-working-tree 2>/dev/null   # a path here means submodule
```

**`GIT_DIR` differs from `GIT_COMMON`, and no superproject path** — you are already isolated. State where, and on what, then go to step 3:

- On a branch — "Already isolated at `<path>` on `<branch>`."
- Detached HEAD — "Already isolated at `<path>` (detached HEAD, externally managed). Branch creation happens at finish time."

**Anything else** — a normal checkout, including a submodule. Continue to step 2.

## 2. Create the workspace

Isolation moves where the user's files live, so it is theirs to authorise. Honour a worktree preference already stated in your instructions; otherwise ask:

> "Set up an isolated worktree? It keeps your current branch untouched."

On a decline, work in place and go to step 3.

### Native tool first

Reach for the harness's own worktree tool — `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, a `--worktree` flag. A native tool owns placement, branch creation and cleanup, so the harness can see and manage what it made; `git worktree add` alongside one leaves state the harness cannot account for. Use it, then go to step 3.

### Git fallback

With no native tool, pick the directory in this order — a stated preference beats observed filesystem state:

1. A worktree directory named in your instructions.
2. An existing `.worktrees/`, else an existing `worktrees/`. Both present: `.worktrees/` wins.
3. Default to `.worktrees/` at the project root.

A project-local worktree directory is **ignored** before anything goes in it, so its contents stay out of the repo:

```bash
git check-ignore -q .worktrees    # exit 0 = ignored, safe to proceed
```

Not ignored: add the directory to `.gitignore` and commit that change first. An unignored worktree directory commits its whole tree into the repository.

```bash
git worktree add "<location>/<branch-name>" -b "<branch-name>"
cd "<location>/<branch-name>"
```

A permission error here is the sandbox refusing: say so, and run step 3 in the current directory instead.

## 3. Set up and baseline

Install what the project declares:

```bash
[ -f package.json ] && npm install
[ -f Cargo.toml ] && cargo build
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f pyproject.toml ] && poetry install
[ -f go.mod ] && go mod download
```

Then run the suite. The **baseline** is what makes every later failure attributable — with one, a red test is yours; without one, it could have been red on arrival.

Green — report and hand back:

```
Workspace ready at <path>
Baseline green (<N> tests, 0 failures)
Ready to implement <feature>
```

Red — report the failures and ask whether to proceed or investigate. Working on top of a red baseline is the user's call to make.

## Done when

- [ ] The detection commands have run, and their verdict is stated.
- [ ] The workspace exists — native tool, git fallback, or in place by consent.
- [ ] Any project-local worktree directory is ignored.
- [ ] Dependencies are installed and the baseline has run, with its result reported.

Hand the finished work to `finishing-a-development-branch`, which reads the same `GIT_DIR`/`GIT_COMMON` signals and owns cleanup of anything created here.
