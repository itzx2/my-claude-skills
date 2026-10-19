# The progress mod ships as its own plugin in this marketplace

`savvy-progress` (vendored from JohnnyVizz/claude-kit) draws a live panel of
every subagent and a band above the prompt, which is what makes
`chief-of-staff` and `implement-spec` runs watchable. It could live inside the `my-claude-skills`
plugin — Claude Code 2.1.299 validates one `hooks/hooks.json` holding both its
hooks module and our command hooks — but it is listed as a second plugin in
this marketplace instead, enabled by a second line in `enabledPlugins`.

The reason is the API it is built on. A mod uses function hooks, an
early-access part of Claude Code that moves between releases, and its manifest
carries fields older versions reject: Claude Code 2.1.236, still the `claude`
on this machine's PATH when this was decided, fails validation on its
`userConfig` options. Inside the main plugin, a version that refuses the mod
could refuse the whole plugin, and with it every skill and the briefing that
tells a session which skills it has. As its own plugin, an older Claude Code
loses only the panel.

## Consequences

Installing everything is still one marketplace, but two installs:
`my-claude-skills@my-claude-skills` and `savvy-progress@my-claude-skills`. The
repo's SessionStart hook installs whatever `enabledPlugins` lists, so cloud
sessions get both; on a local machine the second needs its own
`claude plugin install`.

The skills drive the mod only when its tools are present, so either plugin
works without the other.

Those tools are absent in the desktop app. Tested on 2.1.299 — the mod
hot-reloaded into a running session, and loaded at startup through
`CLAUDE_CODE_PLUGIN_DIRS` — Claude Code announces the mod's server but never
hands `progress` or `step` to the model or to a subagent. The panel works
regardless, because it is drawn from Claude Code's own subagent events. Upstream
draws the band carrying the panel's reopen button only once `progress` has
been called, so a second patch makes any subagent launch start a "Subagents"
band when `autoOpen` is `any`; without it, a closed panel could come back only
through `/agents-info`. If a later Claude Code exposes mod tools to the model,
the bar and per-step progress light up with no change here.
