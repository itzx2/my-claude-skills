# Full Roblox Brain adoption, 2026-10-22

The user directed adoption of all Brain skills as-is, including their resources,
instead of the review's proposed local adaptations or exclusions. All 29 entries
at `ceee4aaa5004502e2a51d78b3c33bba44d84742b` (Brain v2.3.1) are now verbatim.
Earlier patches to the six selected skills, including namespace rewrites, are
removed. This supersedes the scope proposed by the review and the prior live
handoff; the published handoff remains unchanged as a historical snapshot.

The main plugin version is 2.3.0, with 74 skills: 45 existing non-Brain skills and
29 Brain skills. All 29 Brain entry points omit `disable-model-invocation`, so
none is user-only. The existing non-Brain roster has 22 user-only skills.

## Complete dependencies and resources

Each Brain folder includes its full entry point and `references/full.md` (58
files in total). The MIT notice is retained at
`vendor/licenses/roblox-brain-LICENSE`. Every Brain sibling reference has its
corresponding skill present. No added package, CLI or daemon is required simply
to read/load the Markdown.

Operational dependencies remain conditional on the work and host: a connected
Studio MCP bridge for Studio actions; project-specific ProfileStore, UI and
package libraries only where used; Open Cloud credentials/scopes for actual
cloud operations. These are not transitive plugin installation dependencies.
Upstream Python/PyYAML/Luau tools belong to its validation CI, not skill runtime.
The plugin does not install tools, obtain credentials, or replace project owners
as a side effect of installing reference material.

## Claude chat diagnosis and standalone upload

The supplied screenshot shows marketplace sync at `0a4b74c` (main plugin 2.1.0),
not this unmerged candidate. The marketplace sync succeeded but the main plugin
was skipped: the importer required `.claude-plugin/plugin.json` at the plugin
root and reported a nested `plugins/savvy-progress/.claude-plugin/plugin.json`.
The main root manifest exists in Git. This establishes an importer/root-layout
failure, not its underlying implementation cause; the exact cloud resolver path
has not been reproduced. The separate `types` warning is nonfatal unknown-key
stripping and is not the main-plugin skip.

Current [Claude plugin documentation](https://support.claude.com/en/articles/13837440-use-plugins-in-claude)
says skills and commands work in regular chat. Hooks, subagents, and local MCP
servers require Cowork/Claude Code. Installing a skill cannot add shell/Git or
local Studio access to a chat host that lacks those capabilities.
[Manifest documentation](https://code.claude.com/docs/en/plugins-reference)
documents root placement and unknown top-level keys as warnings.

To bypass the ambiguous mixed marketplace/root-plugin upload, build a standalone
main-plugin ZIP with exactly one manifest and no nested sibling plugin:

```powershell
pwsh -NoProfile -File scripts/package-plugin.ps1 -OutputDirectory <fresh-directory>
```

The output includes all 74 complete skill folders, hooks, helper scripts, vendor
provenance/license and project documentation. It excludes Git state, user config,
the marketplace manifest, and savvy-progress. Upload the ZIP through Claude's
Customize > Plugins UI. This does not redesign the existing marketplace or
change the separate mod. Local package validation cannot prove cloud ingestion;
that remains unverified until the user uploads or re-syncs a supported layout.

## Verification scope

The prior six-skill candidate evidence in `roblox-brain-adoption-validation.md`
is historical. Final full-adoption checks are recorded separately in the current
PR and status report. Upstream advice/examples are carried unchanged by explicit
choice; packaging parity is not proof every example is correct or live-tested.
