# Isolated plugin sources for Claude marketplace sync

The reported Claude sync skipped the main plugin with a root-manifest error and
found the nested `savvy-progress` manifest. The main manifest did exist. The old
`source: "./"` included both plugin trees, creating an avoidable ambiguity for
importers that scan a plugin source recursively. We cannot reproduce Claude's
private importer locally; this correction addresses that observed layout and
does not claim its internal parser behavior is known.

Both marketplace entries now use explicit self-contained directories:

```text
.claude-plugin/marketplace.json
plugins/
  my-claude-skills/   # generated main release payload, one manifest
  savvy-progress/    # separate vendored mod, one manifest
```

The main plugin's development files remain at the repository root. Moving them
would unnecessarily break the existing loose-skill installer, vendor paths,
scripts, and documentation. `scripts/marketplace-payload.js generate` copies the
complete allowlisted payload into the main release folder. It excludes the
marketplace manifest, sibling plugins, Git state and personal settings. The
checked-in snapshot is required because Git-backed sync reads committed files.
The byte-parity check rejects stale, missing or extra release files.

`scripts/vendor-catalog.js generate` refreshes the README's per-entry pinned
source links and status from the vendor record. `scripts/vendor.js check`
enforces catalog parity, payload parity, and isolated manifest layout in addition
to existing provenance/version checks. `scripts/test-marketplace-layout.js`
failed against the old source by detecting the main and nested mod manifests;
after correction it checks each actual marketplace source independently.

The unsupported top-level `types` key is removed from savvy-progress's manifest,
with a recorded vendor patch and local version bump. Its actual TypeScript types
remain present; the hooks import them directly. No Brain file is edited.

Claude's [marketplace documentation](https://support.claude.com/en/articles/13837433-manage-plugins-for-your-organization)
supports relative paths to plugin subfolders. Its
[manifest reference](https://code.claude.com/docs/en/plugins-reference) defines
`.claude-plugin/plugin.json` relative to the plugin root and warns about unknown
top-level keys. Chat supports skills/commands; it does not gain local shell, hooks,
subagents or local Studio/MCP capabilities from this packaging change.

Verification must distinguish local layout checks and disposable Claude Code
installation from a successful Claude cloud re-sync. The latter requires the
updated commit on the marketplace's configured branch and a real sync result.
The marketplace receives the correction after integration into its configured
branch and re-sync. A standalone ZIP remains an optional manual-upload path.
