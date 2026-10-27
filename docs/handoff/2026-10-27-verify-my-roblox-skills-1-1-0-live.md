# Verify my-roblox-skills 1.1.0 in a live session

> **Stale once replaced.** The live brief is the single file in `docs/handoff/`.
> If you are reading this from `docs/handoff/archive/`, a later handoff has
> replaced it — read that one instead.

## Task

`my-roblox-skills` 1.1.0 is merged and released, but two things about it have
only been proven by fixture tests and a trial that read the skill files
straight from a branch. Prove them in a real, signed-in Claude Code session:

- the Roblox briefing reaches a **subagent** at SubagentStart (never verified
  since the plugin split), including the new standards line or setup
  suggestion;
- `/my-roblox-skills:setup-roblox-standards` resolves and loads as an
  **installed** plugin skill.

Finishing looks like: both observed in a live session, the evidence recorded
(a comment on PR #25 or a short note in `docs/`), and anything that fails
turned into an issue with the reproduction.

## State

- Branch: `main`. Everything from issue #24 is merged (PR #25, merge commit
  `66c7ee4`), tagged `my-roblox-skills-v1.1.0` and published as a pre-release.
  `my-claude-skills` stays 3.0.0 and `v3.0.0` is still Latest.
- No open PRs and no open issues.
- The merged branches `roblox-standards-briefing` and
  `chore/agent-skills-setup` still exist on the remote, like earlier merged
  branches. Nobody asked for them to be deleted.
- Nothing has been installed in the user's normal Claude Code scope from this
  work. Updating it there is the user's decision.
- A working clone sits at
  `F:\Users\first\AppData\Local\Temp\my-claude-skills-roblox-brain-20261021`,
  on `main`. If it is gone, clone `itzx2/my-claude-skills`.

## Artifacts

- Issue #24 (https://github.com/itzx2/my-claude-skills/issues/24): the spec for
  the setup skill and the briefing changes.
- PR #25 (https://github.com/itzx2/my-claude-skills/pull/25): what shipped, the
  decisions beyond the spec, the test evidence and the trial summary.
- Release `my-roblox-skills-v1.1.0`
  (https://github.com/itzx2/my-claude-skills/releases/tag/my-roblox-skills-v1.1.0).
- `plugins/my-roblox-skills/hooks/roblox-briefing.js`: the briefing under test.
- `plugins/my-roblox-skills/skills/setup-roblox-standards/`: the skill, its
  survey brief and templates.
- `scripts/test-roblox-briefing.js`: the fixture test, the model for what a
  live check should observe.
- `docs/adr/0007-coding-agents-load-the-roblox-standards-through-a-router-pointer.md`:
  why agents get the standards pointer.
- `docs/roblox-brain-adoption-validation.md`: how to install into a throwaway
  config with the desktop app's `claude.exe`, and the Windows constraints.
- `CLAUDE.md`: the full check list, the bump rule, tag schemes, and that
  merges, tags and releases wait for the user's ask.

## Decisions

- **The trial's output stays out of this public repo.** The end-to-end trial
  ran on a copy of the user's private Lumenfall project; its standards file and
  findings describe that project's internals and security gaps. PR #25 carries
  a summary only. Keep it that way in any write-up.
- **A live check observes; it does not install into the user's normal scope**
  unless the user says so. Use a throwaway config, as the validation doc
  describes, or ask the user to update their own install.
- **Lumenfall is never the place to test.** Use a throwaway copy or a fixture
  Rojo folder; the original is read-only for this repo's work.

## Open

- **Live sign-in.** The last headless attempt (`claude -p`) failed because its
  OAuth session had expired, so a live check needs the user signed in, in an
  interactive session or a refreshed headless one.
- **Whether to run the setup skill on Lumenfall for real.** That is the user's
  call, made in their own Lumenfall session; it is not part of this task.
- **Deleting the merged remote branches.** Waiting on the user, if they want it.

## Next action

Ask the user how they want the live check run (update their own install to
1.1.0 and open a fresh session in a Rojo folder, or sign in a throwaway-config
session), then start a subagent from that session and confirm its context holds
the Roblox briefing's standards line or setup suggestion.

## Suggested skills

- `my-claude-skills:diagnosing-bugs`: if the briefing does not reach the
  subagent, to find where SubagentStart output is lost.
- `my-claude-skills:writing-for-agents`: for any wording fix the live run shows
  the briefing or the skill needs.
- `my-claude-skills:code-review`: before asking to merge any fix.
