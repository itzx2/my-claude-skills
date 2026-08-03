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
git -C "$TMP_DIR" sparse-checkout set skills >/dev/null 2>&1

rm -rf "$TARGET"
mkdir -p "$(dirname "$TARGET")"
cp -r "$TMP_DIR/skills" "$TARGET"

echo "Installed $(find "$TARGET" -mindepth 1 -maxdepth 1 -type d | wc -l) skills into $TARGET"
