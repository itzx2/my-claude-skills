# Build /my-roblox-skills:setup-roblox-standards

> **Stale once replaced.** The live brief is the single file in `docs/handoff/`.
> If you are reading this from `docs/handoff/archive/`, a later handoff has
> replaced it — read that one instead.

## Task

Build the `setup-roblox-standards` skill specified in issue #24. It is a new
user-invoked skill in the `my-roblox-skills` plugin. It turns the Roblox domain
skills into one repo's own standards sections, routes every agent to them, and
leaves `code-review` to enforce them.

Finishing looks like this:
- the skill, its four section templates and the briefing changes are built;
- the briefing changes have tests;
- the docs are updated (plugin README, ADR, GLOSSARY *Standards* cluster), and
  `my-roblox-skills` is bumped to 1.1.0;
- one end-to-end run on a throwaway copy of a real Rojo project is recorded in
  the PR;
- the PR is merged and tagged `my-roblox-skills-v1.1.0` as a pre-release.

## State

- This brief is committed on `chore/agent-skills-setup`, the branch of **PR #23**
  (issue-tracker setup). PR #23 is open and not merged. It adds `docs/agents/`
  and an *Agent skills* section to `CLAUDE.md`.
- The GitHub labels `needs-triage`, `needs-info`, `ready-for-agent` and
  `ready-for-human` already exist on the repo, independent of the PR.
- `main` is at `2e4a213`. Releases so far:
  - `v3.0.0` (Latest);
  - `my-roblox-skills-v1.0.0` and `v1.2.1-mcs.3` (savvy-progress), both pre-releases.
- No code for issue #24 exists on any branch. An early, uncommitted
  architecture-only draft was discarded. Build from the spec, not from memory of
  that draft.
- The clone has untracked `.agents/`, `.codex/` and `AGENTS.md`, created by a
  Codex import the user made. Leave them untracked and untouched. Stage
  explicitly, or with `git add -A -- . ':!.agents' ':!.codex' ':!AGENTS.md'`.
- `test-marketplace-layout.js` fails whenever an uncommitted skill folder sits
  under `plugins/my-roblox-skills/skills/`. It derives the expected count from
  the vendor record. The spec's first test change fixes that derivation; until
  then, expect the failure while you work.

## Artifacts

- **Issue #24** (https://github.com/itzx2/my-claude-skills/issues/24): the full
  spec. It has 50 user stories, the marker contract, the rule format, the
  section-to-skill mapping, the standards-document resolution, the briefing
  changes, test seams, out-of-scope items and a likely four-ticket split. Its
  first comment adds the Studio-only-source survey requirement.
- **PR #23** (https://github.com/itzx2/my-claude-skills/pull/23): tracker config.
  `docs/agents/issue-tracker.md` is how to use GitHub Issues here.
- **PR #21** (https://github.com/itzx2/my-claude-skills/pull/21), merged: the
  Roblox plugin split, the router, the briefing and credits. It is the shape to
  extend.
- `docs/adr/0006-roblox-skills-ship-as-their-own-plugin.md`: why
  `my-roblox-skills` stands alone, which is why the dependency on
  `my-claude-skills` stays optional.
- `CLAUDE.md`: the version-bump rule, payload regeneration, the full check list,
  and the per-plugin tag schemes.
- `plugins/my-roblox-skills/hooks/roblox-briefing.js` and
  `scripts/test-roblox-briefing.js`: the hook and its fixture test, which is the
  one behaviour seam the user confirmed.
- `plugins/my-roblox-skills/skills/ask-roblox/ROUTES.md`: the single source the
  briefing reads for the first skill and the Owners section.
- `skills/retro/SKILL.md` ("Implementation vs Review", "Files"): the reviewer-only
  doctrine that the new ADR must record departing from.
- `skills/project-brain/`: prior art for surveying a repo, adopting existing
  names, and writing an `AGENTS.md` router.

## Decisions

The spec holds the design. These are working rules from the user that the spec
does not record:

- **Ask only what needs the user.** Settle obvious technical questions yourself
  and say what you chose. Put real decisions to the user, each with a
  recommendation.
- **Lumenfall is real work and read-only.** It lives at
  `F:\Users\first\Downloads\Roblox Project\Lumenfall` (private GitHub repo
  `riifatrp/leaftd`). Read it for examples only. For the end-to-end run, copy it
  into a scratch or temp folder, run there, show the result, then delete the
  copy. The user approved exactly this. Never write to the original, and never
  run `wally install`, `rojo build` or git writes in it. It is a good probe for
  four reasons:
  - its standards live in `docs/engineering-standards.md`, so the
    adopt-existing-doc path gets exercised;
  - it uses `Init`/`Start`/`Destroy` modules;
  - it runs Selene in CI;
  - it has `AGENTS.md` and no `CLAUDE.md`.
- **One plugin, one briefing.** Each plugin's briefing lists only its own skills.
  The user set this rule and it is implemented. Keep the new briefing lines
  inside `my-roblox-skills`.
- **Merging and releases.** Open a PR per change. The user asks for merges
  explicitly. After a merge, tag and release per `CLAUDE.md`'s scheme, and ask
  before pushing tags.

## Open

- **SubagentStart in a live session.** Injection into a real subagent session has
  never been verified. The headless `claude -p` here failed: its OAuth session
  had expired. A plugin install into a throwaway config works with the desktop
  app's binary (`%APPDATA%\Claude\claude-code\<version>\<hash>\claude.exe`), but
  a live session needs the user signed in.
- **PR #23.** Waiting on the user to merge.

## Next action

Branch from `origin/main` and build ticket 1 of issue #24's suggested split:

- the Roblox briefing lists its plugin's user-invoked skills from disk;
- in a Roblox project it adds the standards pointer, or the setup suggestion when
  there are no standards.

Write the new `scripts/test-roblox-briefing.js` cases first and watch them fail.

## Suggested skills

- `my-claude-skills:tdd`: drive the briefing changes red-green through the
  existing fixture test.
- `my-claude-skills:writing-for-agents`: the skill, the templates and the
  briefing lines are all agent-read documents.
- `my-claude-skills:code-review`: review against `main` with issue #24 as the
  spec before asking to merge.
- `my-roblox-skills:roblox-architecture` and the other domain skills named in
  #24: read them to write section templates that match what they teach.
