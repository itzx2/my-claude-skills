# The progress mod ships as its own plugin in this marketplace

`savvy-progress` (vendored from JohnnyVizz/claude-kit) draws a progress bar and
a live panel of every subagent, which is what makes `chief-of-staff` and
`implement-spec` runs watchable. It could live inside the `my-claude-skills`
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
