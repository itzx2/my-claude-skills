# Working on this repo

This repo *is* the `my-claude-skills` plugin. Other repos install it from this
marketplace, so a change here is a release, not just a commit.

## Bump the version in the same PR

**Any change under `skills/` or `hooks/` needs `version` bumped in the same
pull request.** Those are the two directories Claude Code loads from a plugin,
so a change to either is a change every consumer receives — or should.

Two files, one line each, kept identical:

```
.claude-plugin/plugin.json       "version": "1.3.0"
.claude-plugin/marketplace.json  "version": "1.3.0"
```

The marketplace lists two more plugins, each hand-maintained in its own folder
rather than generated, and the same rule holds for both: any change under
`plugins/my-roblox-skills/` or `plugins/savvy-progress/` bumps the version in
that folder's `.claude-plugin/plugin.json` and in its `marketplace.json` entry.

- `plugins/my-roblox-skills/` holds the Roblox skills, their router and their
  briefing (see `docs/adr/0006`). Its `roblox-*` skills are vendored verbatim,
  so change them only through the vendor record.
- `plugins/savvy-progress/` is a vendored copy, so its version is upstream's
  plus `-mcs.N` (`1.2.1-mcs.1`);
raise N for a change of ours, and reset it to `-mcs.1` on a new upstream
version. `node scripts/vendor.js check` fails when the two disagree.

### Why this is easy to miss

The plugin cache is keyed on the version:
`~/.claude/plugins/cache/my-claude-skills/my-claude-skills/<version>/`. Leave
the version alone and consumers already holding it keep serving the *old* files
from that path, and `claude plugin update` has nothing to move to. Nothing
errors. The PR merges, `main` looks right, and every install silently stays on
the previous content.

That happened across PRs #4 and #5: `main` carried a 91-line `handoff` while
installs kept serving the 16-line one, until v1.3.0 shipped the bump.

### Confirm it worked

A new version means a new cache directory, which is what stops the stale copy
winning. After merging, install into a throwaway config and check the path:

```sh
export CLAUDE_CONFIG_DIR=$(mktemp -d)
claude plugin marketplace add https://github.com/itzx2/my-claude-skills.git
claude plugin install my-claude-skills@my-claude-skills -y
node -e 'const j=require(process.env.CLAUDE_CONFIG_DIR+"/plugins/installed_plugins.json");
console.log(Object.values(j.plugins)[0].slice(-1)[0].installPath)'
```

The path must end in the version you just shipped, and the files under it must
contain your change.

### The session you are in can be running a stale skill

The same cache serves *this* agent. A session has been observed executing
`skills/handoff` from the `1.2.0` cache while `main` was on `1.4.0` — a skill
body two releases behind, with no error and nothing to notice. Before trusting a
skill you were served, check the directory it came from against
`.claude-plugin/plugin.json`:

```sh
ls ~/.claude/plugins/cache/my-claude-skills/my-claude-skills/
```

A version there that is not the manifest's is what you are actually running.

### Tag the merge commit, right after merging

Open a PR per change. Merge it, push a tag or publish a Release only when the
user asks for that action; the steps below are how, once they have.

**Every version bump gets a matching tag on the commit that merged it, and a
GitHub Release built from that tag.** Nothing installs from it: `claude
plugin install` resolves the marketplace at the default branch and keys its
cache on `plugin.json`, so no tool ever reads a tag here. The tag is for people.
GitHub's Releases panel is what a human checks to see whether a repo is alive,
and while tagging was off it read *"2 months ago"* on a day this repo shipped
twice — which is worse than useless, because it is confidently wrong.

**A Claude Code web session cannot do this step.** `git push <tag>` returns 403
through the session proxy, and the GitHub MCP server has no create-tag or
create-release tool — only read ones. The same 403 blocks `git push --delete`
and any force-push, so deleting a merged branch is a human's job too. An agent
finishes at the merge and hands both over:

```sh
git tag -a <tag> <merge-sha> -m "<plugin> <version> — <one line>"
git push origin refs/tags/<tag>
```

Each plugin has its own tag scheme, so a tag never reads as another plugin's
version:

| Plugin | Tag | Release |
| --- | --- | --- |
| `my-claude-skills` | `vX.Y.Z` | Latest |
| `savvy-progress` | `vX.Y.Z-mcs.N`, its version as-is | pre-release, `--latest=false` |
| `my-roblox-skills` | `my-roblox-skills-vX.Y.Z` | pre-release, `--latest=false` |

The Roblox tags carry the plugin name because a bare `v1.0.0` would read as a
`my-claude-skills` version, which went through `1.x` itself. A merge that bumps
several plugins gets one tag each, all on the same merge commit, and only the
`my-claude-skills` Release is marked Latest. Each pre-release note ends with
"Shipped with my-claude-skills v<version> in PR #<n>." when one shipped beside it.

Do it immediately after the merge, while the version is still in front of you. A
tag added "later" is exactly how the previous drift started: hand-tagging left
`1.3.0` through `1.5.0` unmarked while a bare `Release` tag sat on the *initial
commit*, which is why tagging was briefly abandoned altogether. See
`docs/adr/0002` for why it came back rather than staying dropped.

Every tag on the remote now follows the scheme above. The two that predated
it — `Release`, which sat on the initial commit and carried a stale GitHub
Release entry, and `my-claude-skills--v1.2.0` — were deleted on 2026-09-02,
along with that Release entry. Versions `1.3.0` through `1.5.0` are permanently
untagged; they shipped while the rule said not to, and inventing notes for them
now would be fiction.

## Handoffs

`docs/handoff/` holds exactly one handoff — the live brief. Read it; leave
`docs/handoff/archive/` alone. A handoff is **published** the moment the
invocation that wrote it ends, and a published handoff is read-only to every
session including the one that wrote it: the way to change what one says is a
new one, written by the `handoff` skill, which is the only thing that writes
them. It is user-invoked — `/handoff`, or `/my-claude-skills:handoff` as a
plugin — so it will not appear in your own skill listing. A brief going stale is
its normal condition, not a defect: say so once if it matters and let the user
invoke the skill.

## Check the remote before concluding work is missing

`git rev-list --left-right main...origin/main` reports `0 0` when **both** refs
are stale, which reads as "this never landed" and sends you chasing a merge that
already happened. A container's clone can be older than the remote. Run
`git fetch origin main` first, every time.

## Before pushing any change

The root `skills/`, `hooks/`, and main manifest are development sources. The
marketplace serves the generated `plugins/my-claude-skills/` folder so its source
does not contain the sibling mod. After source/documentation/vendor changes:

```sh
node scripts/vendor-catalog.js generate
node scripts/marketplace-payload.js generate
```

Commit the generated payload with its source changes. Edit the root main
manifest, never its generated copy. The vendor check verifies both the catalog
and the complete payload, including each marketplace source's sole root manifest.

```sh
bash scripts/test-briefing.sh      # fixture tests for the briefing walk
node scripts/test-roblox-briefing.js # the Roblox briefing: project detection, subagents
bash scripts/test-install-race.sh  # two concurrent installs stay correct
bash scripts/verify-install.sh     # every skill in skills/ reachable right now
node scripts/vendor.js check       # vendored skills match the vendor record
node scripts/test-marketplace-layout.js # each source has one root manifest
node scripts/test-marketplace-payload.js # stale/extra release content is rejected
bash scripts/test-guard.sh         # the subagent git guard blocks and allows the right commands
```

All checks exit non-zero on failure.

## Vendored skills come from the record

Most of `skills/` is copied from upstreams. Change a vendored skill through
`vendor/record.json` and the `sync-upstream` skill in `.claude/skills/`, not by
editing its folder: an edit to a verbatim skill fails `vendor.js check`, and an
edit to a patched one is lost at the next sync unless it is recorded there as a
patch.

## Where the rest is written down

- **`README.md`** — how the plugin installs, how the briefing works, and the
  hand-maintained skill list. Update that list when you add or remove a skill.
- **`.claude/PLUGIN-SETUP.md`** — wiring this plugin into another repo, and the
  four `claude plugin` behaviours that each cost a debugging cycle.
- **`GLOSSARY.md`** — the vocabulary, in four clusters: *briefing* (roster,
  location, tier, hidden, blind spot, invocation, hand-rolled invocation),
  *handoff* (live brief, published, archive), *vendoring* (upstream, pin,
  verbatim, patched, forked, absorbed, sync, vendor record, clash) and
  *standards* (standards section, house practice, guidance, hard, judgement
  and mechanical rule).
- **`docs/adr/`** — decisions worth their reasoning. `0001` records that handoff
  integrity is instructed rather than enforced, and what that costs; `0003`
  why vendored skills sync from a record; `0004` why the glossary is
  `GLOSSARY.md`; `0005` why the progress mod is a plugin of its own; `0006` why the Roblox
  skills are one too; `0007` why coding agents get a pointer to a repo's Roblox
  standards.
- **`skills/writing-for-agents/`** — the reference for editing any skill here.

## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues (`itzx2/my-claude-skills`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles, each label named after its role (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
