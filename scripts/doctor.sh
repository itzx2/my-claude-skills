#!/bin/bash
# Diagnose the installed skill state. Read-only — it changes nothing.
#
# Run this first whenever skills have "disappeared": a document format is
# missing, the briefing is short, or a router reports that nothing covers a
# task. It answers the question that matters — is the skill absent from disk,
# or present but unreported — which decides whether the fault is the installer
# or the thing reading the roster.
#
#   bash scripts/doctor.sh
set -uo pipefail

SKILLS="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
MANIFEST="$HOME/.claude/.my-claude-skills.manifest"
SYNCED="$SKILLS/synced"
REPO_SKILLS="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)/skills"

ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }
warn() { printf '  \033[33mwarn\033[0m  %s\n' "$1"; }
bad()  { printf '  \033[31mBAD\033[0m   %s\n' "$1"; }

echo "skills dir: $SKILLS"
echo

echo "== installed =="
if [ -d "$SKILLS" ]; then
  total=$(find "$SKILLS" -mindepth 1 -maxdepth 1 -type d | wc -l)
  ok "$total top-level skill directories"
else
  bad "no skills directory — nothing is installed"
  exit 1
fi

if [ -d "$REPO_SKILLS" ]; then
  repo_count=$(find "$REPO_SKILLS" -mindepth 1 -maxdepth 1 -type d | wc -l)
  missing=""
  for d in "$REPO_SKILLS"/*/; do
    name="$(basename "$d")"
    [ -d "$SKILLS/$name" ] || missing="$missing $name"
  done
  if [ -n "$missing" ]; then
    bad "repo has $repo_count skills; NOT installed:$missing"
  else
    ok "all $repo_count repo skills present"
  fi
fi

echo
echo "== installer scope =="
if [ -f "$MANIFEST" ]; then
  ok "manifest present, $(wc -l < "$MANIFEST") entries"
  if grep -qx "synced" "$MANIFEST"; then
    bad "'synced' is in the manifest — the installer would delete it"
  else
    ok "'synced' absent from manifest, so the installer cannot delete it"
  fi
else
  warn "no manifest yet — first run of the current installer will create it"
fi

if [ -f "$HOME/.claude/install-skills.sh" ]; then
  if grep -q "MANIFEST=" "$HOME/.claude/install-skills.sh"; then
    ok "cached installer is the manifest-scoped one"
  else
    bad "cached installer is PRE-FIX — it clears the whole skills directory."
    echo "        Fix now: curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | bash"
  fi
else
  warn "no cached installer — this container has not run the hook yet"
fi

echo
echo "== account-synced skills (the ones that go missing) =="
if [ -d "$SYNCED" ]; then
  n=$(find "$SYNCED" -mindepth 1 -maxdepth 1 -type d | wc -l)
  ok "synced/ present with $n skills"
  for s in xlsx docx pptx pdf; do
    [ -f "$SYNCED/$s/SKILL.md" ] && ok "  $s reachable" || bad "  $s MISSING"
  done
else
  bad "synced/ is ABSENT — xlsx, docx, pptx, pdf and friends are gone."
  echo "        Source of truth is your claude.ai account, so it re-syncs;"
  echo "        a session started before that runs without them."
fi

echo
echo "== entries preserved from other sources =="
if [ -d "$REPO_SKILLS" ]; then
  foreign=$(comm -13 <(ls "$REPO_SKILLS" | sort) <(ls "$SKILLS" | sort) | tr '\n' ' ')
  [ -n "${foreign// /}" ] && ok "not from this repo, left intact: $foreign" \
                          || warn "nothing here but this repo's skills"
fi

echo
echo "== duplicates (same skill in two places, versions can differ) =="
if [ -d "$SYNCED" ] && [ -d "$REPO_SKILLS" ]; then
  dupes=0
  for d in "$SYNCED"/*/; do
    name="$(basename "$d")"
    if [ -d "$REPO_SKILLS/$name" ]; then
      dupes=$((dupes + 1))
      if cmp -s "$d/SKILL.md" "$REPO_SKILLS/$name/SKILL.md"; then
        warn "$name — in both, identical"
      else
        bad "$name — in both and DIFFERENT; unclear which one wins"
      fi
    fi
  done
  [ "$dupes" -eq 0 ] && ok "no skill exists in both synced/ and this repo"
fi

echo
echo "== briefing =="
BRIEF="$HOME/.claude/skills-briefing.py"
[ -f "$BRIEF" ] || BRIEF="$(dirname "${BASH_SOURCE[0]:-$0}")/skills-briefing.py"
if [ -f "$BRIEF" ] && command -v python3 >/dev/null 2>&1; then
  CLAUDE_SKILLS_DIR="$SKILLS" python3 "$BRIEF" | python3 -c '
import json, sys
try:
    c = json.load(sys.stdin)["hookSpecificOutput"]["additionalContext"]
except Exception as exc:
    print(f"  \033[31mBAD\033[0m   briefing did not produce valid JSON: {exc}")
    raise SystemExit(0)
lines = c.splitlines()
mi = [l for l in lines if l.startswith("- `") and not l.startswith("- `/")]
ui = [l for l in lines if l.startswith("- `/")]
print(f"  \033[32mok\033[0m    generates: {len(mi)} model-invokable + {len(ui)} user-only = {len(mi)+len(ui)}")
' || bad "briefing failed to run"
else
  warn "briefing generator not found"
fi
