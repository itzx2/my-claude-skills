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
git -C "$TMP_DIR" sparse-checkout set skills scripts hooks >/dev/null 2>&1

# Replace only the skills this repo owns, tracked in a manifest, and leave every
# other entry in the directory alone.
#
# `rm -rf "$TARGET"` was the obvious way to do this and was wrong: Claude Code
# syncs the account's own skills into $TARGET/synced (xlsx, docx, pdf, pptx,
# skill-creator, morning), so wiping the directory took those out and left the
# session unable to open a spreadsheet until the next sync restored them.
# Deleting is still needed so a skill removed upstream disappears here rather
# than lingering forever — hence the manifest, which records what we put there
# last time and is the only thing we are entitled to remove.
MANIFEST="$HOME/.claude/.my-claude-skills.manifest"

mkdir -p "$TARGET"

# Drop skills we installed previously that the repo no longer carries.
if [ -f "$MANIFEST" ]; then
  while IFS= read -r previous; do
    [ -n "$previous" ] || continue
    if [ ! -d "$TMP_DIR/skills/$previous" ]; then
      rm -rf "${TARGET:?}/$previous"
    fi
  done < "$MANIFEST"
fi

# Install the current set, replacing each skill directory individually.
#
# Known race, low severity, fails safe. Two SessionStart hooks on one container
# run this concurrently and both write this fixed temp path, so the manifest that
# survives can be truncated — every skill is still on disk, installed by whichever
# process won, and only the manifest count betrays it. `doctor.sh` asserts that
# count against the repo's skill count, which is the one check that catches it.
#
# Fix direction, not yet implemented: serialise the whole install under an flock
# on a lockfile so the second hook waits and then no-ops. A unique temp filename
# alone would fix the manifest but leave the rm -rf/cp collision below, which is
# the half that actually fails an install.
: > "$MANIFEST.tmp"
for skill_dir in "$TMP_DIR"/skills/*/; do
  [ -d "$skill_dir" ] || continue
  skill="$(basename "$skill_dir")"
  rm -rf "${TARGET:?}/$skill"
  cp -r "$skill_dir" "$TARGET/$skill"
  printf '%s\n' "$skill" >> "$MANIFEST.tmp"
done
mv -f "$MANIFEST.tmp" "$MANIFEST"

# Cache the hook scripts next to the skills. session-start.sh resolves its
# helpers relative to its own location, so with all three in ~/.claude a session
# start needs no network at all — an unreachable GitHub then degrades to "skills
# weren't refreshed" instead of "the agent got no briefing".
#
# Installed with mv, not cp: this can run from ~/.claude/session-start.sh while
# that very file is executing, and bash reads a script incrementally by offset.
# cp would rewrite the running file in place and make bash resume into garbage;
# mv is an atomic rename, so the running shell keeps its handle on the old inode.
for script in session-start.sh install-skills.sh doctor.sh; do
  if [ -f "$TMP_DIR/scripts/$script" ]; then
    cp "$TMP_DIR/scripts/$script" "$HOME/.claude/.$script.tmp"
    chmod +x "$HOME/.claude/.$script.tmp"
    mv -f "$HOME/.claude/.$script.tmp" "$HOME/.claude/$script"
  fi
done

# briefing.js lives in hooks/, not scripts/, because the plugin's hooks.json
# points at it there. Cache it beside the others so the fallback path can brief
# without the network.
if [ -f "$TMP_DIR/hooks/briefing.js" ]; then
  cp "$TMP_DIR/hooks/briefing.js" "$HOME/.claude/.briefing.js.tmp"
  mv -f "$HOME/.claude/.briefing.js.tmp" "$HOME/.claude/briefing.js"
fi

echo "Installed $(wc -l < "$MANIFEST") skills into $TARGET"
