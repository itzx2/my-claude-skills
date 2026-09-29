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

## Installing does not brief

A plugin's own `SessionStart` hook cannot run in the session that installs it.
Claude Code enumerates plugin hooks from what is on disk when the session
starts; an installing hook runs *after* that, so `hooks/briefing.js` is
registered for the next session and never for this one.

That costs more than it sounds, because of what only the briefing carries.
Skills setting `disable-model-invocation: true` are hidden from the agent's
Skill listing completely, and the briefing is the only thing that tells the
agent they exist. Eighteen skills here set it — every `/`-only one, including
`handoff`, `implement`, `to-tickets`, `triage`, `wayfinder`, `ask-matt` and
`grill-with-docs`.

So a hook that installs and stops gets the model-invocable skills and silently
loses the rest. The symptom is not an error. A user types
`/my-claude-skills:grill-with-docs`; the agent cannot see it in its listing,
concludes it does not exist, and substitutes the nearest visible name —
`grilling` — announcing the swap as a correction. The skill was installed the
whole time and would have run if invoked. Only discovery was missing, and the
half of the work that made it worth choosing (the ADRs and glossary that
`grill-with-docs` adds over `grilling`) silently did not happen.

**Any hook that installs this plugin must emit the briefing itself.** After the
install loop:

```bash
for candidate in "$HOME"/.claude/plugins/cache/my-claude-skills/my-claude-skills/*/hooks/briefing.js; do
  [ -f "$candidate" ] || continue
  node "$candidate" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{process.stdout.write(JSON.parse(s).hookSpecificOutput.additionalContext)})'
  break
done
```

Three things that are easy to get wrong here:

- **`briefing.js` takes no arguments and needs no `CLAUDE_PLUGIN_ROOT`.** It
  reads `$CLAUDE_CONFIG_DIR` (or `~/.claude`) itself. The variable in the
  plugin's own `hooks.json` only locates the script.
- **Unwrap the JSON whenever the hook also writes a plain status line.** Claude
  Code parses stdout as a `hookSpecificOutput` payload only when that is all
  stdout holds; a payload mixed with prose is parsed as neither. Plain text for
  both keeps all of it in context. A hook whose stdout is *only* the briefing
  can print `node "$candidate"` raw — which is what `scripts/session-start.sh`
  does.
- **Read from disk only.** The plugin was installed moments earlier by the same
  hook, so a briefing that cannot be found means that install failed — which the
  hook already reports. A network fallback hides the real fault.

Report a missing roster rather than passing over it. The rule the status line
already follows — never claim skills are ready when they are not — applies to
discovery at a finer grain: skills the agent cannot see are skills it will deny
having.

## Prove it cold

A warm re-run passes whatever you did. Only a cold run proves the setup, so wipe
the plugin cache first:

```bash
rm -rf ~/.claude/plugins
git archive origin/main | tar -x -C /tmp/coldstart      # the real tree, not your worktree
CLAUDE_CODE_REMOTE=true CLAUDE_PROJECT_DIR=/tmp/coldstart /tmp/coldstart/.claude/hooks/session-start.sh
claude plugin list
```

Done when `plugin list` shows **every** plugin from `enabledPlugins`, each once,
**and the roster reached the model** — not merely the hook's stdout. Claude Code
caps hook context at 10,000 characters; over that it saves the output to a file
and hands the model a 2,000-character preview, so a roster can be emitted in full
and still arrive without its user-invoked section. Check what was *delivered*:
in the session transcript, the `hook_additional_context` entry must hold the
roster inline, not a `<persisted-output>` notice. `scripts/test-briefing.sh`
asserts the size budget and that the key parts sit inside the preview.
In this repo `bash scripts/verify-install.sh` answers the same question with an
exit code, which is the form an agent can branch on.
Extract the default branch rather than cloning locally: a local clone follows
your stale local ref and silently tests an old hook.

Two results worth knowing so you don't re-derive them: plugins install cold in
about 30s, and they are available in the *same* session the hook installs them —
no restart needed, despite what `plugin update --help` implies.
What is *not* available in that session is the plugin's own `SessionStart` hook,
which is why the briefing has to come from the installing hook instead (see
*Installing does not brief*).
