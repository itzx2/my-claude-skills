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

### Do not tag releases

**The manifest version is the only release marker. Don't create git tags, and
don't restore the ones that exist.** A tag here marks nothing: `claude plugin
install` resolves the marketplace at the default branch and keys its cache on
`plugin.json`, so a tag is never read by anything and can only disagree with the
version that is. That is what happened — tagging was done by hand, drifted
immediately, and left `1.3.0` and `1.4.x` unmarked while a bare `Release` tag
pointed at the initial commit. The rule above already enforces the one number
that matters, in the same PR as the change it describes.

Two tags predate this decision and are being deleted by hand:
`Release` and `my-claude-skills--v1.2.0`. If you still see them, they are
leftovers, not a convention to follow.

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
