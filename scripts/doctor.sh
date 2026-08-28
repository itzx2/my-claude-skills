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

# The cached copy at ~/.claude/doctor.sh has no repo beside it. Fall back to the
# manifest, which names the same skills, so the cached copy stays useful in a
# session that never checked this repo out.
OWNED_LIST="$(mktemp)"
trap 'rm -f "$OWNED_LIST"' EXIT
if [ -d "$REPO_SKILLS" ]; then
  OWNED_FROM="repo"
  (cd "$REPO_SKILLS" && ls -d */ 2>/dev/null | tr -d /) | sort > "$OWNED_LIST"
elif [ -f "$MANIFEST" ]; then
  OWNED_FROM="manifest"
  sort "$MANIFEST" | grep -v '^$' > "$OWNED_LIST"
else
  OWNED_FROM="none"
  : > "$OWNED_LIST"
fi
owned_count=$(wc -l < "$OWNED_LIST")

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

if [ "$OWNED_FROM" != "none" ]; then
  missing=""
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    [ -d "$SKILLS/$name" ] || missing="$missing $name"
  done < "$OWNED_LIST"
  if [ -n "$missing" ]; then
    bad "$owned_count expected (per $OWNED_FROM); NOT installed:$missing"
  else
    ok "all $owned_count skills from this repo present (per $OWNED_FROM)"
  fi
else
  warn "no repo checkout and no manifest — cannot tell which skills are expected"
fi

echo
echo "== installer scope =="
if [ -f "$MANIFEST" ]; then
  manifest_n="$(grep -c . "$MANIFEST")"
  ok "manifest present, $manifest_n entries"
  # A short manifest is the only symptom of two SessionStart hooks racing: both
  # installs write the same fixed temp file, so the survivor can be truncated
  # while every skill is still present on disk. Every other check here passes in
  # that state, which is why this one exists. The installer now serialises under
  # a lock, so a mismatch means a container still running a cached pre-lock copy
  # — re-running the current installer both repairs it and replaces that copy.
  # Only meaningful when the counts come from different places — with
  # OWNED_FROM=manifest the comparison is circular.
  if [ "$OWNED_FROM" = "repo" ]; then
    owned_n="$(grep -c . "$OWNED_LIST")"
    if [ "$manifest_n" -eq "$owned_n" ]; then
      ok "manifest count matches the repo's $owned_n skills"
    else
      bad "manifest has $manifest_n entries but the repo ships $owned_n — a raced install truncated it; re-run install-skills.sh"
    fi
  fi
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
if [ "$OWNED_FROM" != "none" ]; then
  foreign=$(comm -13 "$OWNED_LIST" <(ls "$SKILLS" | sort) | tr '\n' ' ')
  [ -n "${foreign// /}" ] && ok "not from this repo, left intact: $foreign" \
                          || warn "nothing here but this repo's skills"
fi

echo
echo "== duplicates (same skill in two places, versions can differ) =="
if [ -d "$SYNCED" ] && [ "$OWNED_FROM" != "none" ]; then
  dupes=0
  for d in "$SYNCED"/*/; do
    name="$(basename "$d")"
    if grep -qx "$name" "$OWNED_LIST"; then
      dupes=$((dupes + 1))
      if cmp -s "$d/SKILL.md" "$SKILLS/$name/SKILL.md"; then
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
BRIEF="$(dirname "${BASH_SOURCE[0]:-$0}")/../hooks/briefing.js"
[ -f "$BRIEF" ] || BRIEF="$HOME/.claude/briefing.js"
if [ -f "$BRIEF" ] && command -v node >/dev/null 2>&1; then
  node "$BRIEF" | node -e '
let s = "";
process.stdin.on("data", d => s += d).on("end", () => {
  let c;
  try {
    c = JSON.parse(s).hookSpecificOutput.additionalContext;
  } catch (e) {
    console.log(`  \x1b[31mBAD\x1b[0m   briefing did not produce valid JSON: ${e.message}`);
    return;
  }
  const lines = c.split("\n");
  const mi = lines.filter(l => l.startsWith("- `") && !l.startsWith("- `/"));
  const ui = lines.filter(l => l.startsWith("- `/"));
  console.log(`  \x1b[32mok\x1b[0m    generates: ${mi.length} model-invocable + ${ui.length} user-only = ${mi.length + ui.length}`);
});
' || bad "briefing failed to run"
else
  warn "briefing generator not found"
fi
