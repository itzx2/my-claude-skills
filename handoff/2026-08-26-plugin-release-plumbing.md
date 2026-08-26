# Skills plugin — release plumbing, briefing coverage, handoff redesign

> **Stale once replaced.** The live brief is the single file in `handoff/`. If
> you are reading this from `handoff/archive/`, a later handoff has replaced it
> — read that one instead.

## Task

This repo *is* the `my-claude-skills` plugin; other repos install it from this
marketplace, so a change here is a release. The work was making that release
path actually reach consumers, and making the briefing describe every skill a
session really has.

That is shipped and merged. Finishing now means the leftovers below — one code
task an agent can do alone, two decisions, and one thing only a human can do.

## State

**Branch:** `claude/handoff-2026-08-26`, cut from `main` at `d084ccd`. `main`
itself is clean and holds PRs #4–#9.

**Version 1.4.1** in both manifests. Verified after 1.4.0 that a cold install
resolves to a fresh cache directory and serves the new content — that is the
check that matters, not the tag.

**Two things that will surprise you:**

- **A session can run a stale plugin.** This one loaded `skills/handoff` from
  the `1.2.0` cache while `main` was on 1.4.0, so the skill it executed was two
  releases behind. Check
  `~/.claude/plugins/cache/my-claude-skills/my-claude-skills/<version>/` against
  `.claude-plugin/plugin.json` before trusting any skill body you were served.
- **This agent cannot delete branches or push tags.** `git push --delete` and
  `git push <tag>` both 403 through the session proxy; direct REST is refused
  with *"GitHub access is not enabled for this session"*; and the GitHub MCP
  server has `create_branch` but no delete or tag equivalent. Creating branches,
  PRs and merges all work. Ten merged branches are still on the remote as a
  result — deleting them needs a human.

## Artifacts

| What | Where |
| --- | --- |
| Release rule, and why the mistake is invisible | `CLAUDE.md` |
| Wiring this plugin into another repo, and four `claude plugin` behaviours that each cost a cycle | `.claude/PLUGIN-SETUP.md` |
| Vocabulary: roster, location, tier, hidden, blind spot, invocation | `CONTEXT.md` |
| The install hook consumers copy | `.claude/settings.json`, `.claude/hooks/session-start.sh` |
| Briefing walk, and the rationale comments | `hooks/briefing.js` |
| Fixture tests (14) and the install assertion | `scripts/test-briefing.sh`, `scripts/verify-install.sh` |
| The install race, documented at its site | `scripts/install-skills.sh`, above `: > "$MANIFEST.tmp"` |
| PRs: install hook, briefing coverage, skill edits, v1.3.0, release rule, handoff redesign, rescue | #4, #5, #6, #7, #8, #9 |

## Decisions

- **Consumers install via a committed hook, at user scope.** Declaring a
  marketplace in `.claude/settings.json` does not fetch it, and since Claude Code
  v2.1.195 a plugin enabled only by project settings and sourced from GitHub does
  not load until something installs it. `--scope project` was rejected: it
  rewrites the tracked settings file, so every session starts dirty.
- **Bump the version on any change under `skills/` or `hooks/`, in the same PR.**
  Mechanical on purpose — the cache is keyed on the version, so a missed bump
  leaves consumers silently on old content while `main` looks correct.
- **A handoff is one live file.** Everything earlier moves to `handoff/archive/`,
  which nothing reads, so a predecessor cannot be cited — the move is the only
  statement that an old one is stale. Knowledge still true and living nowhere
  else is rescued *out* to a primary source first.
- **`claude-handoff` was left untouched** and now diverges substantially. A
  deliberate call, not an oversight.
- **Suggested-skills entries carry names only**, not full namespaced
  invocations.

## Open

- **Ten merged branches on the remote.** Needs a human; see *State* for why.
  Everything except `main` is merged and safe.
- **Tagging is half-broken and unresolved.** `1.3.0` and `1.4.x` are untagged,
  and the bare `Release` tag points at the *initial commit*. Recommendation on
  the table was to drop tagging entirely, since the manifest version is the real
  source of truth and `CLAUDE.md` already enforces it. Waiting on a decision.
- **Voice-of-Customer contradicts the handoff skill.** Its `AGENTS.md` and
  `handoff/README.md` mandate numbered, explicitly-chained handoffs — *"each
  supersedes the last and says so at the top"* — plus a table keeping old ones
  alive as partial references. An agent there gets two incompatible instructions
  and the repo-local rules usually win. Separate repo, separate decision.
- **The install race has a fix direction, not a fix.** Two SessionStart hooks on
  one container both write the fixed `"$MANIFEST.tmp"`. `doctor.sh` now detects
  it; nothing prevents it.

## Next action

Implement the `flock` serialisation in `scripts/install-skills.sh`. The comment
above `: > "$MANIFEST.tmp"` states the shape: take a lock around the **whole**
install so a second hook waits and then no-ops. A unique temp filename alone is
not enough — it fixes the manifest and leaves the `rm -rf`/`cp` collision, which
is the half that actually fails an install. Then confirm `doctor.sh` still
reports the manifest count matching, and bump the version.

## Suggested skills

- `writing-for-agents` — required reading before editing any skill, `CLAUDE.md`,
  or a pointed-at doc here.
- `scrutinize` — it is the one that asks whether a change should exist in this
  shape at all; worth running on the flock design before writing it.
- `code-review` — against a fixed point, before merging.
- `grilling` — for the Voice-of-Customer convention conflict, which is a decision
  rather than a task.
- `ask-matt` — if none of the above obviously fits; it routes over everything
  installed, including skills this list omits.

No credentials appear in this file, and none were handled this session. The
`GITHUB_TOKEN` present in the environment authenticates the session's own tooling
and must not be copied anywhere.
