---
name: finishing-a-development-branch
description: Decide how finished work gets integrated — merge locally, open a PR, or leave the branch — then execute that choice and clean up the workspace. Use once implementation is done and the suite is green, after /code-review.
---

# Finishing a Development Branch

The end of the implementation chain: `/implement` commits to the branch, `/code-review` judges what it committed, and this decides where the branch goes. Verify **green**, read the environment, put the choice to the user, execute it, clean up what this convention created.

## 1. Verify green

Run the project's full suite (`npm test` / `cargo test` / `pytest` / `go test ./...`) against the tree you are about to integrate. An earlier green run only proves the tree it ran on, and the menu in step 4 is a question about *this* one.

Red — report the failures and stop. The integration menu comes after a green suite.

## 2. Read the environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

Capture `WORKTREE_PATH` **now**, while you are still inside the workspace — step 5 changes directory before step 6 needs the value.

| State | Menu | Cleanup |
| --- | --- | --- |
| `GIT_DIR` == `GIT_COMMON` (normal repo) | three options | nothing to clean |
| `GIT_DIR` != `GIT_COMMON`, named branch | three options | by provenance (step 6) |
| `GIT_DIR` != `GIT_COMMON`, detached HEAD | two options, no merge | externally managed — leave in place |

## 3. Fix the base

The **base** is whatever this work forked from — usually named in the plan, the conversation, or the branch's upstream. Confirm it before any merge; a merge into the wrong base is expensive to undo. When it is not already known, ask: "This branch split from `<best guess>` — is that right?"

## 4. Put the choice to the user

Integration is the user's decision. Present the menu and wait for an answer.

**Normal repo, or a named-branch worktree:**

```
Implementation complete. What would you like to do?

1. Merge back to <base> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)

Which option?
```

**Detached HEAD:**

```
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)

Which option?
```

Present the menu as written. Throwing the work away is a separate path, reached only when the user asks for it in so many words — see *Discarding* below.

## 5. Execute the choice

### Option 1 — merge locally

Merge first and verify the result before removing anything:

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git checkout <base>
git pull
git merge <feature-branch>
<test command>
```

A red merged result stops everything: leave the worktree and the branch in place and investigate. Nothing has been pushed, so the merge is local and recoverable.

Green merged result — clean up the workspace (step 6), then drop the branch:

```bash
git branch -d <feature-branch>
```

### Option 2 — push and open a PR

```bash
git push -u origin <feature-branch>
# from a detached HEAD, name the branch on the remote:
# git push origin HEAD:refs/heads/<new-branch>
```

Open the pull request against the base with the forge's own tooling — its CLI, or the creation URL most forges print on push — following the repo's PR template and conventions where it has them. Report the URL.

Keep the worktree: PR feedback gets fixed in it, and it stays until the work lands.

A rejected push means the remote moved while you worked. Investigate what landed; force-pushing is the user's explicit call, never yours.

### Option 3 — keep as-is

Report: "Keeping branch `<name>`. Worktree preserved at `<path>`."

## 6. Clean up the workspace

Runs for option 1 and for a confirmed discard. Options 2 and 3 preserve the worktree. Both callers have already moved to the main repo root — removal has to run from outside the worktree — and use the values captured in step 2.

**`GIT_DIR` == `GIT_COMMON`** — a normal repo, nothing to clean. Done.

**`WORKTREE_PATH` under `.worktrees/` or `worktrees/`** — the `using-git-worktrees` convention created this, so cleanup belongs here:

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune   # self-healing: clears stale registrations
```

Removal refused with `contains modified or untracked files` means that worktree holds files that exist nowhere else — uncommitted notes, plans, scratch work. Show what is at stake and let the user choose; `--force` destroys those files permanently, so it waits on their answer:

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

```
Worktree removal refused — these files were never committed:

<file list>

1. Commit them to <branch> before cleanup
2. Move them into <main repo root>
3. Delete them (unrecoverable)

Which?
```

Carry out the choice, then remove the worktree.

**Any other path** — the host environment owns this workspace, so leave it where it is. Where the harness offers a workspace-exit tool (`ExitWorktree` and the like), use that instead.

## Discarding

Reached only when the user asks to throw the work away. Confirm first:

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

The typed word `discard` is what authorises deletion. On anything else, treat the request as still open and ask what they meant. Once it arrives:

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

Clean up the workspace (step 6), then `git branch -D <feature-branch>`.

## Done when

- [ ] The full suite ran on the tree being integrated, and was green.
- [ ] The base is confirmed.
- [ ] The user picked from the menu, and that choice is executed.
- [ ] Cleanup matches the choice: worktree removed for option 1, preserved for options 2 and 3.
- [ ] Any URL or branch state the user needs is reported back.
