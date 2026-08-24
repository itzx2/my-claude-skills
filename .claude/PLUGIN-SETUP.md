# Making Claude Code plugins actually install in a repo

For the agent wiring plugins into a new repo. The working example is beside this
file: `.claude/settings.json` + `.claude/hooks/session-start.sh`. Copy the shape,
and read this for the parts the script cannot tell you.

Adapted from the same file in `itzx2/Voice-of-Customer`, where this pattern is in
production against three marketplaces.

## Declared is not installed

Listing a marketplace in `.claude/settings.json` does not put it on disk. Nothing
fetches it. The name still *resolves* — so `claude plugin install x@some-market`
gets far enough to fail with **"not found in marketplace"**, which reads like a
wrong plugin name and is not. A container in this state reports
`No marketplaces configured` and has no `~/.claude/plugins`, while the config
looks perfect.

This is documented behaviour, not a bug: as of Claude Code v2.1.195 a plugin that
only the project's `.claude/settings.json` enables, and that comes from an
external source such as a GitHub repository, does not load until something
installs it.

Assume any "plugins declared but missing" report is this, and fix it by fetching.

## The two calls, both required

```bash
claude plugin marketplace add "$url"              # fetches it to disk
claude plugin install "$plugin@$marketplace" -y   # then this can succeed
```

`marketplace add` alone installs nothing.

Four things that bite:

- **`claude plugin` exits 0 when an install fails.** Exit codes and `set -e` both
  lie here. Detect failure by parsing output or re-checking `plugin list`, and
  treat plugin setup as best-effort so an unreachable marketplace still leaves a
  usable session.
- **`-y` is required** whenever stdin/stdout is not a TTY, which is every hook.
- **Keep the default `user` scope.** `--scope project` rewrites the tracked
  `.claude/settings.json`, so every session starts with a dirty working tree.
- **The marketplace name comes from its own manifest, not its URL.**
  `obra/superpowers` registers as `superpowers-dev`. The name must match the
  `enabledPlugins` key or the install misses.

## Wiring

Drive both loops from `settings.json` — read `extraKnownMarketplaces[*].source.url`
and the true keys of `enabledPlugins` — so adding a plugin later is one edit
there and none to the hook.

Then the three things that silently waste a cycle if missed:

1. `chmod +x` the hook, and confirm git recorded mode `100755`.
2. Register it under `hooks.SessionStart` in `.claude/settings.json`, merging
   into that file rather than replacing it — it already holds the plugin config.
3. **Merge to the default branch.** Sessions clone the default branch, so a hook
   on a working branch runs for nobody.

## The self-reference caveat, specific to this repo

This repo *is* the `my-claude-skills` plugin, and the marketplace above points at
its GitHub URL. A session on a feature branch therefore installs whatever is on
`main`, not the branch in front of it — so an agent editing a skill here will not
see its own edit reflected in the installed plugin.

That is correct for using the skills and wrong for developing them. When you need
the working tree installed instead, add the checkout as a local marketplace,
which records the current commit:

```bash
claude plugin marketplace add .
claude plugin install my-claude-skills@my-claude-skills -y
```

A consuming repo has no such problem: it is not the plugin, so the GitHub URL is
always what it wants.

## Prove it cold

A warm re-run passes whatever you did. Only a cold run proves the setup, so wipe
the plugin cache first:

```bash
rm -rf ~/.claude/plugins
git archive origin/main | tar -x -C /tmp/coldstart      # the real tree, not your worktree
CLAUDE_CODE_REMOTE=true CLAUDE_PROJECT_DIR=/tmp/coldstart /tmp/coldstart/.claude/hooks/session-start.sh
claude plugin list
```

Done when `plugin list` shows **every** plugin from `enabledPlugins`, each once.
Extract the default branch rather than cloning locally: a local clone follows
your stale local ref and silently tests an old hook.

Two results worth knowing so you don't re-derive them: plugins install cold in
about 30s, and they are available in the *same* session the hook installs them —
no restart needed, despite what `plugin update --help` implies.
