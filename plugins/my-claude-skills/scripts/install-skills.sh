#!/bin/bash
# Installs the skills/ folder from itzx2/my-claude-skills into ~/.claude/skills.
# Works anywhere with plain outbound HTTPS - no GitHub App / repo-source access needed,
# since it clones the repo's public HTTPS URL directly rather than going through
# Claude Code's scoped repo-attach mechanism.
set -euo pipefail

REPO_URL="https://github.com/itzx2/my-claude-skills.git"
TARGET="$HOME/.claude/skills"

TMP_DIR="$(mktemp -d)"
LOCK_DIR=""
cleanup() {
  rm -rf "$TMP_DIR"
  [ -n "$LOCK_DIR" ] && rmdir "$LOCK_DIR" 2>/dev/null
  return 0
}
trap cleanup EXIT

# MY_CLAUDE_SKILLS_SRC points the installer at an existing checkout instead of
# cloning. It exists so scripts/test-install-race.sh can run *this* script
# concurrently for real — the race it guards against lives in the mutating half
# below, and a test that re-implemented that half would stop testing the thing
# that ships. Unset in normal use, where the clone is the source.
if [ -n "${MY_CLAUDE_SKILLS_SRC:-}" ]; then
  cp -r "$MY_CLAUDE_SKILLS_SRC/." "$TMP_DIR/"
else
  git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$TMP_DIR" >/dev/null 2>&1
  git -C "$TMP_DIR" sparse-checkout set skills scripts hooks >/dev/null 2>&1
fi

# Identifies the source content, so a second install can tell it would be doing
# the same work again. Falls back to a value that never matches, which makes an
# unidentifiable source always install rather than always skip.
SOURCE_REV="$(git -C "$TMP_DIR" rev-parse HEAD 2>/dev/null || echo "unknown-$$")"

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
STAMP="$HOME/.claude/.my-claude-skills.stamp"
LOCK="$HOME/.claude/.my-claude-skills.lock"

mkdir -p "$TARGET"

# Everything below this point mutates shared state, so it runs one at a time.
#
# Sessions on the skills repo itself register this hook twice — user-level in
# ~/.claude/settings.json and repo-level in .claude/settings.json — and Claude
# Code runs both in parallel. Both registrations are individually correct, so
# the fix belongs here rather than in deleting one of them.
#
# Ten trials of the unserialised loop run two-up produced a correct manifest
# zero times. What went wrong, and why the lock has to cover the whole install
# rather than just the manifest:
#
#   manifest holds 1 entry          one process mv'd the temp away; the other's
#                                   remaining >> recreated it with the rest
#   manifest holds 13-20 for 10     interleaved appends, duplicated names
#   cp: cannot create directory     one process rm -rf'd a skill dir while the
#     -> install exits 1            other was mid-cp into it
#   mv: cannot stat '....tmp'       the other process already claimed the temp
#     -> install exits 1
#
# A unique temp filename fixes the first two and leaves the rm -rf/cp
# collision, which is the half that actually fails an install.
#
# Failure here is not worth killing a session start over: the process holding
# the lock is doing this same install, so on timeout we leave it to that one.
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK"
  flock -w 120 9 || { echo "Another install holds the lock; leaving it to that one"; exit 0; }
else
  # macOS ships no flock(1). mkdir is atomic on every POSIX filesystem, which
  # is the one property a lock needs. It cannot release on death the way an
  # fd-held flock does, hence the stale break: a lock older than the timeout
  # belongs to a process that is gone.
  waited=0
  until mkdir "$LOCK.d" 2>/dev/null; do
    if [ "$waited" -ge 120 ]; then
      rm -rf "$LOCK.d"
      mkdir "$LOCK.d" 2>/dev/null || { echo "Could not take the install lock; skipping"; exit 0; }
      break
    fi
    sleep 1
    waited=$((waited + 1))
  done
  LOCK_DIR="$LOCK.d"
fi

# Second hook through the lock: no-op rather than redo the identical install.
#
# The stamp alone is not enough to skip on — it says what was installed last,
# not that it is still there. So this also requires that the manifest names
# exactly the skills this source carries and that each is present on disk,
# which makes a manual re-run still repair a damaged directory, and makes a
# manifest truncated by a pre-lock installer heal on the next session start.
if [ -f "$STAMP" ] && [ -f "$MANIFEST" ] && [ "$(cat "$STAMP" 2>/dev/null)" = "$SOURCE_REV" ]; then
  expected="$( (cd "$TMP_DIR/skills" && ls -d -- */ 2>/dev/null | tr -d /) | sort )"
  actual="$(grep -v '^$' "$MANIFEST" | sort)"
  if [ -n "$expected" ] && [ "$expected" = "$actual" ]; then
    intact=1
    while IFS= read -r name; do
      [ -d "$TARGET/$name" ] || { intact=0; break; }
    done <<< "$expected"
    if [ "$intact" -eq 1 ]; then
      echo "Skills already installed at $SOURCE_REV; nothing to do"
      exit 0
    fi
  fi
fi

# Drop skills we installed previously that the repo no longer carries.
if [ -f "$MANIFEST" ]; then
  while IFS= read -r previous; do
    [ -n "$previous" ] || continue
    if [ ! -d "$TMP_DIR/skills/$previous" ]; then
      rm -rf "${TARGET:?}/$previous"
    fi
  done < "$MANIFEST"
fi

# Install the current set, replacing each skill directory individually. The
# fixed temp path and the rm -rf/cp pair below are only safe because the lock
# above holds for the rest of this script — do not move either out from under it.
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

# Written last, and only on a complete run, so it can never claim an install
# that a failure part-way through left unfinished.
printf '%s\n' "$SOURCE_REV" > "$STAMP"

echo "Installed $(wc -l < "$MANIFEST") skills into $TARGET"
