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

**Every version bump gets a matching `vX.Y.Z` tag on the commit that merged it,
and a GitHub Release built from that tag.** Nothing installs from it: `claude
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
git tag -a v<version> <merge-sha> -m "v<version> — <one line>"
git push origin refs/tags/v<version>
```

Do it immediately after the merge, while the version is still in front of you. A
tag added "later" is exactly how the previous drift started: hand-tagging left
`1.3.0` through `1.5.0` unmarked while a bare `Release` tag sat on the *initial
commit*, which is why tagging was briefly abandoned altogether. See
`docs/adr/0002` for why it came back rather than staying dropped.

Every tag on the remote now follows the `vX.Y.Z` scheme. The two that predated
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

```sh
bash scripts/test-briefing.sh      # fixture tests for the briefing walk
bash scripts/test-install-race.sh  # two concurrent installs stay correct
bash scripts/verify-install.sh     # every skill in skills/ reachable right now
```

All three exit non-zero on failure.

## Where the rest is written down

- **`README.md`** — how the plugin installs, how the briefing works, and the
  hand-maintained skill list. Update that list when you add or remove a skill.
- **`.claude/PLUGIN-SETUP.md`** — wiring this plugin into another repo, and the
  four `claude plugin` behaviours that each cost a debugging cycle.
- **`CONTEXT.md`** — the vocabulary, in two clusters: *briefing* (roster,
  location, tier, hidden, blind spot, invocation, hand-rolled invocation) and
  *handoff* (live brief, published, archive).
- **`docs/adr/`** — decisions worth their reasoning. `0001` records that handoff
  integrity is instructed rather than enforced, and what that costs.
- **`skills/writing-for-agents/`** — the reference for editing any skill here.
