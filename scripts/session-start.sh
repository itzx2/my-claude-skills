#!/bin/bash
# SessionStart hook: install the skills from itzx2/my-claude-skills, then tell
# the agent what it just got.
#
# Two things happen here, and the second is the point:
#
#   1. In a remote/cloud environment, mirror skills/ into ~/.claude/skills.
#   2. Emit a SessionStart additionalContext payload describing every installed
#      skill, split into the ones the agent may invoke itself and the ones only
#      the user can trigger with /<name>. Claude Code hides the latter from the
#      agent completely, so without this briefing it never learns they exist.
#
# Self-contained on purpose: it can be curl'd and piped straight into bash from
# a global settings.json hook or an environment setup script, with no checkout
# of this repo present. When a checkout *is* present, the sibling scripts are
# preferred over the network copies.
#
# Failure here must never block a session, so the install is best-effort: a
# network blip degrades this to "no new skills", not "session won't start".
set -uo pipefail

RAW_BASE="https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

# `pipefail` plus a piped invocation means $0 may not be a real path; fall back
# to the network copies when it isn't.
SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

# Everything on stdout is injected into the agent's context, and Claude Code
# parses it for the JSON payload. Keep progress chatter on stderr so the only
# thing on stdout is the briefing itself.
log() { echo "[skills] $*" >&2; }

# --- 1. Install ------------------------------------------------------------
# Only in remote environments. On a local machine ~/.claude/skills is a symlink
# into a clone of this repo, and install-skills.sh would delete that symlink.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  if [ -f "$SCRIPT_DIR/install-skills.sh" ]; then
    bash "$SCRIPT_DIR/install-skills.sh" >&2 || log "install failed; continuing with whatever is already in $SKILLS_DIR"
  else
    curl -fsSL "$RAW_BASE/install-skills.sh" | bash >&2 || log "install failed; continuing with whatever is already in $SKILLS_DIR"
  fi
else
  log "not a remote environment; skipping install"
fi

# --- 2. Brief the agent ----------------------------------------------------
if [ ! -d "$SKILLS_DIR" ]; then
  log "no skills directory at $SKILLS_DIR; nothing to brief"
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  log "python3 not found; skipping the skills briefing"
  exit 0
fi

# Prefer a copy on disk (a checkout of this repo, or the one install-skills.sh
# leaves behind) and only reach for the network as a last resort.
BRIEFING=""
for candidate in "$SCRIPT_DIR/skills-briefing.py" "$HOME/.claude/skills-briefing.py"; do
  if [ -n "$candidate" ] && [ -f "$candidate" ]; then
    BRIEFING="$candidate"
    break
  fi
done

if [ -n "$BRIEFING" ]; then
  CLAUDE_SKILLS_DIR="$SKILLS_DIR" python3 "$BRIEFING" || log "briefing failed"
else
  curl -fsSL "$RAW_BASE/skills-briefing.py" \
    | CLAUDE_SKILLS_DIR="$SKILLS_DIR" python3 - || log "briefing failed"
fi

exit 0
