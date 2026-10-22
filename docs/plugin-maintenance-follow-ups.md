# Plugin maintenance follow-ups

These are historical observations awaiting verification, not prerequisites for
Roblox Brain vendoring. No cleanup or cross-project edits are authorized here.

- Issue-tracker setup was pending: `docs/agents/issue-tracker.md` was absent.
  GitHub Issues was recommended. The user-only setup skill can configure it when
  invoked; do not silently invent tracker configuration.
- Voice-of-Customer still used CONTEXT.md when checked on October 19. Renaming
  was proposed but not authorized or started; inspect that project before acting.
- The normal skill roster contained branch finishing and worktree skills from
  both this plugin and superpowers. Whether to keep the separate superpowers
  installation is the user's outstanding choice.
- Original clone `F:\Users\first\Desktop\CRG_Work\my-claude-skills` had untracked
  `.agents/`, `.codex/` and AGENTS.md from a mechanical Codex import, including
  incorrect `my-Codex-skills` naming. Do not commit or use that imported router.
  Deletion or ignoring remains undecided; the isolated Brain clone has no AGENTS.md.
- Terminal CLI version and progress-tool exposure need fresh-session verification
  before troubleshooting. See ADR 0005 for the durable progress-plugin decisions.
