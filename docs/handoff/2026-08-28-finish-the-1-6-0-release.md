# Finish the 1.6.0 release — the tag, the Release entry, and two false tags

> **Stale once replaced.** The live brief is the single file in `docs/handoff/`.
> If you are reading this from `docs/handoff/archive/`, a later handoff has
> replaced it — read that one instead.

## Task

v1.6.0 is merged and installs correctly. What is left is the part a Claude Code
web session physically cannot do: push the tag, publish the Release, and remove
two tags that are actively misleading. **You are being handed this because you
run locally and your `git push` is not proxied.**

Finishing means GitHub's Releases panel names `v1.6.0` and says nothing false.
It currently shows a single empty Release called *"My Claude Skills"*, published
2026-07-01, hanging off a tag that points at the **initial commit** — so the
repo advertises "2 months ago" on a day it shipped twice.

## State

**Branch:** `claude/latest-handoff-status-4bw3tz`, cut from `main` at `a60eb8b`.
This handoff and the folder migration below are the only things on it; it needs
a PR into `main` before anything here is done. Everything else described is
already on `main`.

**Version 1.6.0**, identical in `.claude-plugin/plugin.json` and
`marketplace.json`, shipped by the merge commit **`8e3d6c4`**. That is the SHA
the tag belongs on — not `a60eb8b`, which is docs-only and correctly untagged. A
cold install was verified to resolve to `.../my-claude-skills/1.6.0` and serve
the new files.

**Remote is clean of branches.** Only `main` and the working branch above exist;
the twelve merged ones are already deleted. Do not go looking for them.

**Two tags remain, both wrong to keep:**

| Tag | Points at | Why it goes |
| --- | --- | --- |
| `Release` | `08bb3d3`, the initial commit | Carries the stale Release entry (id `347324001`). Deleting the tag does **not** delete the Release — that is a separate step. |
| `my-claude-skills--v1.2.0` | `11b8d71`, genuinely v1.2.0 | Accurate but superseded by the `vX.Y.Z` scheme. |

**What a web session cannot do, verified this session rather than assumed:**
`git push <tag>`, `git push --delete`, and any force-push all return **HTTP 403**
through the session proxy, and the GitHub MCP server exposes no create-tag or
create-release tool — only read ones. This is why the work stopped here.

**This repo's `handoff/` moved to `docs/handoff/`** in this invocation, with
`git mv` so history follows. Nothing routed to the old path, so no router needed
rewriting.

## Artifacts

| What | Where |
| --- | --- |
| The tagging rule, the exact commands, and what a web session can't do | `CLAUDE.md`, *Tag the merge commit* |
| Why tagging was dropped and then restored hours later | `docs/adr/0002` |
| Why handoff integrity is prose rather than a blocking hook, and where that fails silently | `docs/adr/0001` |
| Vocabulary: live brief, published, archive, hand-rolled invocation | `CONTEXT.md` |
| The rule as consumers receive it | `skills/handoff/README-TEMPLATE.md` |
| The install lock, its evidence table, and the two-up test | `scripts/install-skills.sh`, `scripts/test-install-race.sh` |
| The 1.6.0 release and the tagging reversal | PRs #11, #12 |

## Decisions

- **Releases are tagged again, for humans only.** No tool reads a tag here —
  `claude plugin install` resolves the marketplace at the default branch and
  keys its cache on `plugin.json`. The Releases panel is a human reader, and the
  first rule counted only the machines. Reasoning in `docs/adr/0002`.
- **`1.3.0` through `1.5.0` stay permanently untagged.** They shipped while the
  rule said not to tag; writing notes for them now would be invention.
- **A handoff is published when its invocation ends**, and is read-only
  afterwards to every session including the one that wrote it. The invocation is
  the boundary because commit- and merge-based boundaries leave "I am still the
  session that owns this" open, which is the loophole every breach used.
- **That rule is instructed, not enforced.** A `PreToolUse` hook could have
  denied the write and was rejected in favour of prose. It binds only where it
  is loaded, so it is planted in `AGENTS.md`/`CLAUDE.md` rather than only in the
  skill.
- **Handoffs live in `docs/handoff/`**, and invoking the skill migrates a repo
  that still keeps `handoff/` at the root.

## Open

- **Manual tagging can drift again.** It is the same hand-tagging that left
  three versions unmarked before; only timing guards it now. A GitHub Action
  tagging on a `plugin.json` version change is the real fix if it slips twice.
- **Voice-of-Customer is untouched by choice.** It has nine files under
  `handoff/` and four path references in `AGENTS.md:48-63`, all still pointing at
  the root folder. Running the skill there migrates them.
- **Consumers keep serving whatever version they cached** until
  `claude plugin update` runs in each. Until then the new rules are not in front
  of those agents at all — the silent failure `docs/adr/0001` predicts.

## Next action

Tag the release and push it:

```sh
git tag -a v1.6.0 8e3d6c4 -m "v1.6.0 — published handoffs, serialised install, tagging restored"
git push origin refs/tags/v1.6.0
```

Then, in order: delete the two stale tags
(`git push origin --delete refs/tags/Release refs/tags/my-claude-skills--v1.2.0`),
delete the old *"My Claude Skills"* Release entry through the GitHub UI or API
since deleting its tag will not remove it, and publish a Release from `v1.6.0`.

## Suggested skills

- `writing-for-agents` — required before editing any skill, `CLAUDE.md`, or a
  doc that is pointed at from one.
- `scrutinize` — for the GitHub Action question under **Open**, which is a
  design call rather than a task.
- `code-review` — against a fixed point, before merging the branch above.
- `ask-matt` — routes over every installed skill, including ones this list omits.

No credentials appear in this file and none were handled. The `GITHUB_TOKEN` in
the environment authenticates the session's own tooling and belongs nowhere else.
