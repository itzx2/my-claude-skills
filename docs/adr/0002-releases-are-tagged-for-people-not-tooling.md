# Releases are tagged for people, not for tooling

Tagging was dropped earlier the same day it was reinstated, on the argument that
a tag here is read by nothing: `claude plugin install` resolves the marketplace
at the default branch and keys its cache on `plugin.json`, so the manifest
version is the only marker any tool consults. That argument was correct and
still is. It was also incomplete — it weighed only the machine readers.

GitHub's Releases panel is a human reader, and it is the one most people check
first to decide whether a repository is alive. With tagging off, that panel
showed *"2 months ago"* on a day this repo shipped twice, because the only
Release entry hung off a bare `Release` tag pointing at the initial commit. A
missing signal would have been merely unhelpful; a confidently wrong one sent
its own author looking for a release step that had already completed.

So: every version bump gets a `vX.Y.Z` tag on its merge commit and a Release
built from it. The tag makes no claim about how the plugin installs — the
manifest version keeps that job alone, and `CLAUDE.md` still enforces the bump
in the same PR as the change.

## Consequences

Tags cannot be pushed from a Claude Code web session: `git push <tag>` returns
403 through the session proxy, and the GitHub MCP server exposes no create-tag
or create-release tool. The release therefore ends with a handoff to a human,
and the hand-tagging that drifted before is now structural rather than
accidental. The mitigation is timing, not tooling — tag at the merge, never
"later" — because the earlier drift came entirely from tags added out of band.

Versions `1.3.0` through `1.5.0` stay untagged. They shipped under the opposite
rule, and back-filling releases for them would mean writing notes after the
fact for work already delivered.
