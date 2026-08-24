#!/bin/bash
# SessionStart hook — prepare a fresh Claude Code on the web container by
# installing the plugins this repo declares in .claude/settings.json.
#
# The container clones the repo with no plugins on disk, so without this a web
# session has none of the skills. Declaring a marketplace in settings.json does
# not put it on disk; something has to fetch it. That is this hook's whole job.
#
# The pattern is lifted from itzx2/Voice-of-Customer, where it is in production.
# See PLUGIN-SETUP.md beside this file for the failures it encodes.
set -euo pipefail

# Local checkouts keep their plugins across sessions; only the ephemeral
# container needs to reinstall on every start.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Everything here is an enhancement and must never abort a session: a
# marketplace can be unreachable through no fault of the repo, and `claude
# plugin` exits 0 even when an install fails, so neither its exit code nor
# set -e can be trusted to mean what they normally would. Failures are counted,
# reported, and skipped.
plugin_failures=0

install_plugins() {
  local settings=".claude/settings.json"
  [ -f "$settings" ] || return 0
  command -v claude >/dev/null 2>&1 || return 0
  command -v node >/dev/null 2>&1 || return 0

  local url plugin

  # Both calls are required. `marketplace add` fetches the catalog to disk;
  # without it `plugin install` fails with "not found in marketplace", which
  # reads like a wrong plugin name and is not.
  while IFS= read -r url; do
    [ -n "$url" ] || continue
    claude plugin marketplace add "$url" >&2 \
      || { echo "  skipped marketplace $url" >&2; plugin_failures=$((plugin_failures + 1)); }
  done < <(node -e '
    const s = JSON.parse(require("fs").readFileSync(".claude/settings.json", "utf8"));
    for (const m of Object.values(s.extraKnownMarketplaces || {})) {
      if (m && m.source && m.source.url) console.log(m.source.url);
    }
  ')

  # -y is required whenever stdin/stdout is not a TTY, which is every hook.
  # Default (user) scope is deliberate: --scope project rewrites the tracked
  # settings.json and every session would start with a dirty working tree.
  while IFS= read -r plugin; do
    [ -n "$plugin" ] || continue
    claude plugin install "$plugin" -y >&2 \
      || { echo "  skipped plugin $plugin" >&2; plugin_failures=$((plugin_failures + 1)); }
  done < <(node -e '
    const s = JSON.parse(require("fs").readFileSync(".claude/settings.json", "utf8"));
    for (const [id, on] of Object.entries(s.enabledPlugins || {})) if (on) console.log(id);
  ')
}
install_plugins || { echo "  plugin setup aborted" >&2; plugin_failures=$((plugin_failures + 1)); }

# Only this line reaches the session context, so it must not claim the skills
# are ready when they are not: an agent told its skills are present and then
# unable to find them is worse off than one told plainly that they are missing.
if [ "$plugin_failures" -gt 0 ]; then
  echo "Plugin setup incomplete — $plugin_failures step(s) failed; skills from those plugins are NOT available this session."
else
  echo "Plugins installed. The my-claude-skills roster follows from the plugin's own briefing hook."
fi
