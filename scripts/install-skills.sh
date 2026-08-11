#!/bin/bash
# Installs the skills/ folder from itzx2/my-claude-skills into ~/.claude/skills.
# Works anywhere with plain outbound HTTPS - no GitHub App / repo-source access needed,
# since it clones the repo's public HTTPS URL directly rather than going through
# Claude Code's scoped repo-attach mechanism.
set -euo pipefail

REPO_URL="https://github.com/itzx2/my-claude-skills.git"
TARGET="$HOME/.claude/skills"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$TMP_DIR" >/dev/null 2>&1
git -C "$TMP_DIR" sparse-checkout set skills scripts >/dev/null 2>&1

rm -rf "$TARGET"
mkdir -p "$(dirname "$TARGET")"
cp -r "$TMP_DIR/skills" "$TARGET"

# Cache the hook scripts next to the skills. session-start.sh resolves its
# helpers relative to its own location, so with all three in ~/.claude a session
# start needs no network at all — an unreachable GitHub then degrades to "skills
# weren't refreshed" instead of "the agent got no briefing".
#
# Installed with mv, not cp: this can run from ~/.claude/session-start.sh while
# that very file is executing, and bash reads a script incrementally by offset.
# cp would rewrite the running file in place and make bash resume into garbage;
# mv is an atomic rename, so the running shell keeps its handle on the old inode.
for script in session-start.sh install-skills.sh skills-briefing.py; do
  if [ -f "$TMP_DIR/scripts/$script" ]; then
    cp "$TMP_DIR/scripts/$script" "$HOME/.claude/.$script.tmp"
    chmod +x "$HOME/.claude/.$script.tmp"
    mv -f "$HOME/.claude/.$script.tmp" "$HOME/.claude/$script"
  fi
done

echo "Installed $(find "$TARGET" -mindepth 1 -maxdepth 1 -type d | wc -l) skills into $TARGET"
