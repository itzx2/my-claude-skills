#!/bin/bash
# Environment setup script: register the skills SessionStart hook globally, so
# every session in this container gets the skills and the briefing — whichever
# repo it opens.
#
# Why this exists: `.claude/settings.json` inside this repo only covers sessions
# opened on this repo. The user-scope equivalent is `~/.claude/settings.json`,
# but a cloud container rebuilds `~/.claude` from the image every time, so
# nothing you write there by hand survives. Running this from the environment's
# setup script re-creates the registration at provision time.
#
# Paste this into Claude Code on the web -> environment settings -> setup script:
#
#   curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | bash
#
# Idempotent: re-running never duplicates the hook entry, and existing settings
# (including hooks from other sources) are preserved. Hooks merge across
# settings scopes, so this coexists with whatever the base image registers.
set -uo pipefail

RAW_BASE="https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts"
SETTINGS="$HOME/.claude/settings.json"
HOOK_COMMAND="curl -fsSL $RAW_BASE/session-start.sh | bash"

log() { echo "[skills-bootstrap] $*" >&2; }

if ! command -v python3 >/dev/null 2>&1; then
  log "python3 not found; cannot register the hook"
  exit 0
fi

mkdir -p "$HOME/.claude"

SETTINGS="$SETTINGS" HOOK_COMMAND="$HOOK_COMMAND" python3 <<'PY'
import json
import os

settings_path = os.environ["SETTINGS"]
command = os.environ["HOOK_COMMAND"]

# Never clobber an existing file: a corrupt one is left alone rather than
# replaced, since overwriting could drop unrelated settings.
settings = {}
if os.path.exists(settings_path):
    try:
        with open(settings_path, encoding="utf-8") as handle:
            settings = json.load(handle)
    except (OSError, ValueError):
        raise SystemExit("existing settings.json is unreadable; leaving it alone")

if not isinstance(settings, dict):
    raise SystemExit("existing settings.json is not an object; leaving it alone")

hooks = settings.setdefault("hooks", {})
session_start = hooks.setdefault("SessionStart", [])

already = any(
    entry.get("command") == command
    for group in session_start
    if isinstance(group, dict)
    for entry in group.get("hooks", [])
    if isinstance(entry, dict)
)

if already:
    print("hook already registered", flush=True)
else:
    session_start.append({"hooks": [{"type": "command", "command": command}]})
    with open(settings_path, "w", encoding="utf-8") as handle:
        json.dump(settings, handle, indent=2)
        handle.write("\n")
    print("registered SessionStart hook", flush=True)
PY

status=$?
if [ "$status" -ne 0 ]; then
  log "could not register the hook; sessions will start without the skills briefing"
  exit 0
fi

# Install now as well, so the very first session in this container doesn't pay
# the clone cost inside its own startup hook.
if [ -f "$(dirname "${BASH_SOURCE[0]:-}")/install-skills.sh" ]; then
  bash "$(dirname "${BASH_SOURCE[0]}")/install-skills.sh" >&2 || log "initial install failed; the hook will retry each session"
else
  curl -fsSL "$RAW_BASE/install-skills.sh" | bash >&2 || log "initial install failed; the hook will retry each session"
fi

exit 0
