# After the 2.1.0 release: tracker setup and the loose ends

> **Stale once replaced.** The live brief is the single file in `docs/handoff/`.
> If you are reading this from `docs/handoff/archive/`, a later handoff has
> replaced it — read that one instead.

## Task

2.0.0 (Matt Pocock's skills re-synced through a vendor record, glossary moved
to `GLOSSARY.md`) and 2.1.0 (`chief-of-staff` orchestration, the
`savvy-progress` panel plugin, the subagent git guard) are merged, tagged,
released and installed. What remains is follow-up, chiefly giving this repo an
issue tracker so `to-spec`, `to-tickets`, `triage` and `implement-spec` have
somewhere to publish. Finishing means `docs/agents/issue-tracker.md` exists and
the items under **Open** are each settled or consciously parked.

## State

**Branch:** `main` at `1f574e1` holds both releases; this handoff rides on
`claude/handoff-2026-10-20` and needs merging into `main` like any change.
Tags `v2.0.0` (`2fe46ed`) and `v2.1.0` (`1f574e1`) are pushed with GitHub
Releases; `v2.1.0` is Latest. The merged `release/*` branches are deleted on
GitHub.

**Untracked in the local clone, and not ours:** `.agents/`, `.codex/`,
`AGENTS.md`, created 2026-10-20 01:59 by a Codex import. `AGENTS.md` is
`CLAUDE.md` with every "Claude" swapped for "Codex" (down to
"my-Codex-skills"), so it is wrong as written. Do not commit it, and do not
treat it as this repo's `AGENTS.md`; the user decides whether to delete or
ignore it.

**Installed on the user's Windows machine:** `my-claude-skills` 2.1.0 at user
scope and at project scope for this clone, and `savvy-progress` 1.2.1-mcs.1 at
user scope. The `claude` on PATH is 2.1.236, too old to read the mod's
manifest; the desktop app's bundled 2.1.299 (`%APPDATA%\Claude\claude-code\
2.1.299\...\claude.exe`) did the installs and runs `claude plugin test` /
`validate`.

**Vendor clones** used by `scripts/vendor.js` live in the OS temp directory
(`my-claude-skills-vendor/`); they are a cache and safe to delete.

**`scripts/test-briefing.sh` fails 6 cases on this Windows machine**, and
failed the same 6 on `main` before this work: fixture paths, not the roster.
Its roster-fits-the-cap case passes.

## Artifacts

| What | Where |
| --- | --- |
| The 2.0.0 change, review findings and fixes | https://github.com/itzx2/my-claude-skills/pull/16 |
| The 2.1.0 change, the desktop-app limit, judgement calls left | https://github.com/itzx2/my-claude-skills/pull/17 |
| Every upstream, pin, and vendored entry's status and patches | `vendor/record.json` |
| How a sync runs, step by step | `.claude/skills/sync-upstream/SKILL.md` |
| Why sync is a record plus helpers | `docs/adr/0003` |
| Why the glossary is `GLOSSARY.md` | `docs/adr/0004` |
| Why the mod is its own plugin, and what the desktop app lacks | `docs/adr/0005` |
| Vendoring vocabulary (upstream, pin, verbatim, patched, forked, absorbed, sync, vendor record, clash) | `GLOSSARY.md` |
| The guard and its 44 cases | `hooks/subagent-git-guard.js`, `scripts/test-guard.sh` |
| The checks to run before any push | `CLAUDE.md`, *Before pushing any change* |

## Decisions

- **One install carries everything.** The user wants a repo or machine to need
  only the my-claude-skills marketplace; that is why savvy-progress ships here
  as a second plugin rather than from claude-kit, and why Skill Verifier's
  `reference/.claude/settings.json` enables both.
- **Subagents may call skills.** An earlier reading took the user's interest in
  savvy-flow as "subagents must never invoke skills"; that was wrong and was
  withdrawn. What the user wanted was a skill that orchestrates subagents, which
  `chief-of-staff` now is. Do not reintroduce a no-skills-in-subagents rule.
- **implement-spec stays close to upstream.** It gets progress reporting only,
  no review gate: its quality comes from `tdd` per ticket and one `code-review`
  over the integration branch, as Matt designed it.
- **Rewrite every skill reference, not just known clashes.** `prototype` came
  back "Unknown skill" by short name while `karpathy-guidelines` resolved, so
  the namespace rewrite covers all references (README *Vendored skills*).
- **Major version for the glossary move.** 2.0.0 because skills stopped reading
  `CONTEXT.md`; repos still on it lose their glossary silently until renamed.

## Open

- **Issue tracker for this repo:** GitHub Issues (the repo lives on GitHub and
  `gh` is authenticated as `itzx2`) or local markdown under `.scratch/`.
  Waiting on the user running the setup skill and choosing.
- **Voice-of-Customer still has `CONTEXT.md`** at its root, so the 2.0.0 skills
  read no glossary there. A session card was proposed on 2026-10-19 to clone it,
  `git mv` to `GLOSSARY.md`, fix references and open a PR; waiting on the user.
  Skill Verifier is already renamed.
- **Skills installed twice:** `finishing-a-development-branch` and
  `using-git-worktrees` resolve from both this plugin and the separately
  installed superpowers plugin, and the briefing flags it. Waiting on the user
  deciding whether the superpowers plugin stays.
- **Terminal `claude` is 2.1.236.** `claude update` would let terminal sessions
  read the mod's manifest; waiting on the user.
- **The mod's progress and step tools** never reach the model in the desktop app
  (2.1.299). Nothing to do unless a later Claude Code exposes them; then the bar
  and per-step counts work with no change (ADR 0005).

## Next action

Ask the user to run `/my-claude-skills:setup-matt-pocock-skills` in this repo,
recommending GitHub Issues — it is user-invoked, so you cannot start it — then
commit the `docs/agents/` files and the `## Agent skills` block it writes, with
no version bump (neither lives under `skills/` or `hooks/`).

## Suggested skills

- `setup-matt-pocock-skills` — the next action; user-invoked.
- `sync-upstream` — repo-local; for the next Matt or claude-kit sync, and
  `chief-of-staff` changes upstream often.
- `writing-for-agents` — before editing any skill, `CLAUDE.md`, or a doc a
  skill points at.
- `code-review` — against `origin/main` before merging anything here; it found
  real guard and `vendor.js` bugs last time.
- `ask-matt` — routes over every installed skill when the next step is unclear.
