#!/bin/bash
# Concurrency tests for scripts/install-skills.sh.
#
# Sessions on this repo register the SessionStart hook twice — user-level and
# repo-level — and Claude Code runs both in parallel, so two installs overlap on
# one container. Before the lock, ten two-up trials produced a correct manifest
# zero times: truncated manifests, duplicated names, and `cp: cannot create
# directory` / `mv: cannot stat` failures that exited the install non-zero.
#
# These run the real installer against a fixture source, so the thing under test
# is the script that ships rather than a copy of its loop.
#
#   bash scripts/test-install-race.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
INSTALLER="$ROOT/scripts/install-skills.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0; fail=0
ok()  { printf '  \033[32mok\033[0m    %s\n' "$1"; pass=$((pass + 1)); }
bad() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail + 1)); }

# --- fixture source --------------------------------------------------------
# Ten skills is what the original trials used, and enough that an interleaved
# append loop lands mid-list rather than by luck at an edge.
SRC="$TMP/src"
mkdir -p "$SRC/skills" "$SRC/scripts" "$SRC/hooks"
SKILL_NAMES=(alpha bravo charlie delta echo foxtrot golf hotel india juliet)
for name in "${SKILL_NAMES[@]}"; do
  mkdir -p "$SRC/skills/$name"
  printf -- '---\nname: %s\ndescription: Fixture skill %s.\n---\n' "$name" "$name" \
    > "$SRC/skills/$name/SKILL.md"
done
# The installer also caches these three through fixed temp paths — the same
# shared-path hazard as the manifest, so they belong under the same lock.
for s in session-start.sh install-skills.sh doctor.sh; do
  printf '#!/bin/bash\necho %s\n' "$s" > "$SRC/scripts/$s"
done
printf 'console.log("{}")\n' > "$SRC/hooks/briefing.js"
git -C "$SRC" init -q 2>/dev/null
git -C "$SRC" -c user.email=t@t -c user.name=t add -A >/dev/null 2>&1
git -C "$SRC" -c user.email=t@t -c user.name=t commit -qm fixture >/dev/null 2>&1

EXPECTED="$(printf '%s\n' "${SKILL_NAMES[@]}" | sort)"

run() { # <fake-home> [...extra env] — one install, output captured
  HOME="$1" MY_CLAUDE_SKILLS_SRC="$SRC" bash "$INSTALLER" 2>&1
}

# Everything the installer is supposed to leave behind, checked together: a
# manifest naming exactly the source's skills, each one on disk, and the cached
# scripts intact. A raced install broke these in different combinations, so the
# assertion has to cover all of them at once.
check_state() { # <fake-home> -> prints the first problem found, or nothing
  local home="$1" manifest="$home/.claude/.my-claude-skills.manifest" actual name
  [ -f "$manifest" ] || { echo "no manifest"; return; }
  actual="$(grep -v '^$' "$manifest" | sort)"
  if [ "$actual" != "$EXPECTED" ]; then
    echo "manifest has $(grep -c . "$manifest") entries, want ${#SKILL_NAMES[@]}"
    return
  fi
  for name in "${SKILL_NAMES[@]}"; do
    [ -f "$home/.claude/skills/$name/SKILL.md" ] || { echo "$name not on disk"; return; }
  done
  for name in session-start.sh install-skills.sh doctor.sh; do
    [ -s "$home/.claude/$name" ] || { echo "$name not cached"; return; }
  done
}

# --- two-up ----------------------------------------------------------------
echo "== two installs at once =="
TRIALS=5
race_fail=""
for i in $(seq 1 "$TRIALS"); do
  home="$TMP/race-$i"
  mkdir -p "$home"
  run "$home" > "$TMP/out-$i.a" & a=$!
  run "$home" > "$TMP/out-$i.b" & b=$!
  wait "$a"; rc_a=$?
  wait "$b"; rc_b=$?
  if [ "$rc_a" -ne 0 ] || [ "$rc_b" -ne 0 ]; then
    race_fail="trial $i exited $rc_a/$rc_b: $(cat "$TMP/out-$i.a" "$TMP/out-$i.b" | tr '\n' ' ')"
    break
  fi
  problem="$(check_state "$home")"
  if [ -n "$problem" ]; then
    race_fail="trial $i: $problem"
    break
  fi
done
[ -z "$race_fail" ] && ok "$TRIALS trials, both processes clean and state correct" \
                    || bad "$race_fail"

# The second process through the lock must not redo the identical install.
# Without this the lock is still correct, just wasteful — but a no-op is also
# what keeps the second hook from churning every skill directory on disk while
# a session is already reading them.
grep -q "nothing to do" "$TMP/out-1.a" "$TMP/out-1.b" 2>/dev/null \
  && ok "the second install no-ops" \
  || bad "neither process reported a no-op; both did the full install"

# --- sequential behaviour --------------------------------------------------
echo "== re-runs =="
HOME_SEQ="$TMP/seq"
mkdir -p "$HOME_SEQ"
run "$HOME_SEQ" >/dev/null
out="$(run "$HOME_SEQ")"
printf '%s' "$out" | grep -q "nothing to do" && ok "unchanged source re-run no-ops" \
                                             || bad "re-run reinstalled: $out"

rm -rf "$HOME_SEQ/.claude/skills/delta"
run "$HOME_SEQ" >/dev/null
[ -f "$HOME_SEQ/.claude/skills/delta/SKILL.md" ] \
  && ok "a deleted skill is repaired despite a matching stamp" \
  || bad "stamp made the installer skip a broken directory"

# A manifest truncated by a pre-lock installer is the state this container was
# found in. It has to heal on the next run, not persist behind the stamp.
printf 'alpha\n' > "$HOME_SEQ/.claude/.my-claude-skills.manifest"
run "$HOME_SEQ" >/dev/null
problem="$(check_state "$HOME_SEQ")"
[ -z "$problem" ] && ok "a truncated manifest heals on the next run" || bad "$problem"

# --- no flock --------------------------------------------------------------
# macOS has no flock(1), so the mkdir fallback is the path most consumers would
# hit. Hide flock from PATH to exercise it.
echo "== mkdir fallback (no flock) =="
NOFLOCK="$TMP/nopath"
mkdir -p "$NOFLOCK"
for dir in /usr/local/bin /usr/bin /bin; do
  [ -d "$dir" ] || continue
  for p in "$dir"/*; do
    n="${p##*/}"
    [ "$n" = flock ] && continue
    [ -e "$NOFLOCK/$n" ] || ln -sf "$p" "$NOFLOCK/$n"
  done
done
HOME_NF="$TMP/noflock"
mkdir -p "$HOME_NF"
PATH="$NOFLOCK" HOME="$HOME_NF" MY_CLAUDE_SKILLS_SRC="$SRC" bash "$INSTALLER" > "$TMP/nf.a" 2>&1 & a=$!
PATH="$NOFLOCK" HOME="$HOME_NF" MY_CLAUDE_SKILLS_SRC="$SRC" bash "$INSTALLER" > "$TMP/nf.b" 2>&1 & b=$!
wait "$a"; rc_a=$?
wait "$b"; rc_b=$?
problem="$(check_state "$HOME_NF")"
{ [ "$rc_a" -eq 0 ] && [ "$rc_b" -eq 0 ] && [ -z "$problem" ]; } \
  && ok "two-up without flock is correct too" \
  || bad "no-flock path: exits $rc_a/$rc_b ${problem:+, }$problem"
[ -d "$HOME_NF/.claude/.my-claude-skills.lock.d" ] \
  && bad "the mkdir lock was left behind" \
  || ok "the mkdir lock is released"

echo
printf '%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
