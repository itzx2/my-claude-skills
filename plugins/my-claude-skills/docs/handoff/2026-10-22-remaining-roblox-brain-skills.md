# Fetch the remaining useful Roblox Brain skills

> **Stale once replaced.** The live brief is the single file in `docs/handoff/`.
> If you are reading this from `docs/handoff/archive/`, a later handoff has
> replaced it — read that one instead.

## Task

Continue the user's Roblox Brain adoption by reviewing and fetching the remaining
useful vendor skills into my-claude-skills. Finish with recorded inclusion decisions,
complete resource folders, preserved patches and validated packaging on the draft PR.

## State

Work in `F:\Users\first\AppData\Local\Temp\my-claude-skills-roblox-brain-20261021`,
branch `codex/roblox-brain-adoption`, remote `itzx2/my-claude-skills`.
The implementation through `b1e1a46d36744d3991eb74430cbfe48ab74d843f` is pushed;
this handoff adds documentation on top. PR #19 is open and draft. Nothing is
merged, released or installed in the normal user scope. Refresh remote state first.
The displayed Skill Verifier workspace is not the working clone. If the temporary
clone disappeared, recover this branch from GitHub.

## Artifacts

- [PR #19](https://github.com/itzx2/my-claude-skills/pull/19): candidate implementation and review fixes.
- `vendor/record.json`: authoritative 29-skill Brain catalog, six patched entries,
  23 skipped; pinned v2.3.1 at `ceee4aaa5004502e2a51d78b3c33bba44d84742b`.
- `.claude/skills/sync-upstream/SKILL.md` and `scripts/vendor.js`: vendor workflow.
- `README.md`: shipped roster and dependency explanation; update when expanding it.
- `docs/roblox-brain-adoption-validation.md`: exact candidate evidence, dependency
  audit, disposable-install paths and Windows reproduction constraints.
- `docs/plugin-maintenance-follow-ups.md`: parked maintenance decisions.
- `CLAUDE.md` and `docs/adr/0003-vendored-skills-are-synced-from-a-record.md`:
  version, push checks and vendor-record rules.

## Decisions

- Brain is the chosen vendor. Keep one reviewed installation through our plugin;
  do not restart the vendor comparison or install his marketplace alongside ours.
- Six was an assistant-selected first slice, not a dependency limit or a final
  user-approved cap. The user challenged it and now wants remaining fetching handled.
- Prioritize the 18 remaining Core, Gameplay and Tools entries. The five Design
  entries remain optional. Review collaboration-mode for overlap with our existing
  orchestration before adopting or adapting it. All 23 are not approved verbatim.
- Keep the current upstream pin for this expansion unless a separate reason to
  update it is established. Fetch complete folders through the vendor workflow,
  preserve MIT attribution and record every patch. Revisit optional-reference links
  and the partial-library wording as bundled siblings increase.
- Preserve source ownership discovery across Git and selected Studio, authored UI
  geometry during behavior wiring, lifecycle-aware retries and live MCP capability
  gating. The user's failure case involved duplicate persistence because Studio
  source was overlooked; document volume alone did not prevent it.
- Delegate bounded reading and mechanical work to Luna 6; the parent owns final
  inclusion and review judgments. Continue routine work without repeated permission.

## Open

Per-skill take/patch/skip decisions are still needed for the skipped entries.
Use the vendor workflow's recommendation round for unresolved scope decisions;
do not treat optional Design or overlapping collaboration behavior as settled.
Packaging proof currently covers six Brain skills and 51 plugin skills only;
expansion needs fresh validation. Six baseline Windows briefing failures remain.
Studio was disconnected; live game validation is unavailable, but fetching can proceed.
Merge, release and normal-scope installation remain separate pending decisions.

## Next action

After refreshing the branch and PR, classify the 23 skipped Brain entries at the
existing pin into take/patch/skip recommendations, starting with Core, Gameplay
and Tools, and record the expansion decisions before fetching them.

## Suggested skills

- `sync-upstream` (repo-local): fetch complete entries and preserve recorded patches.
- `my-claude-skills:writing-for-agents`: keep local skill adaptations precise.
- `my-claude-skills:code-review`: review standards and intended behavior after expansion.
- `my-claude-skills:scrutinize`: inspect dependencies, ownership and capability assumptions.
