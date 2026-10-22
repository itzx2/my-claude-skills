#!/bin/bash
# Assert that every skill this repo ships is reachable in the current session's
# roster. Exits non-zero when any is missing.
#
# doctor.sh prints diagnostics for a human to read; this is the machine answer
# to "did the install actually work?" — the thing an agent can branch on, and
# the check to run after .claude/hooks/session-start.sh in a fresh container.
#
# Accepts either installed shape: `my-claude-skills:<name>` when installed as a
# plugin, or a bare `<name>` when installed loose into ~/.claude/skills.
#
#   bash scripts/verify-install.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
BRIEFING="$ROOT/hooks/briefing.js"
PLUGIN="$(node -e 'console.log(require("'"$ROOT"'/.claude-plugin/plugin.json").name)' 2>/dev/null || echo my-claude-skills)"

if ! command -v node >/dev/null 2>&1; then
  echo "node not found; cannot verify" >&2
  exit 2
fi
if [ ! -f "$BRIEFING" ]; then
  echo "briefing not found at $BRIEFING" >&2
  exit 2
fi

ROSTER="$(node "$BRIEFING" | node -e '
let s = "";
process.stdin.on("data", d => s += d).on("end", () => {
  try { process.stdout.write(JSON.parse(s).hookSpecificOutput.additionalContext); }
  catch { process.stdout.write(""); }
});')"

if [ -z "$ROSTER" ]; then
  echo "briefing produced no roster — nothing is installed" >&2
  exit 1
fi

missing=(); found=0
for dir in "$ROOT"/skills/*/; do
  [ -d "$dir" ] || continue
  name="$(basename "$dir")"
  if printf '%s' "$ROSTER" | grep -qE "\`/?($PLUGIN:)?${name}\`"; then
    found=$((found + 1))
  else
    missing+=("$name")
  fi
done

total=$((found + ${#missing[@]}))
if [ "${#missing[@]}" -eq 0 ]; then
  printf '\033[32mok\033[0m  all %s skills reachable in this session\n' "$total"
  exit 0
fi

printf '\033[31mFAIL\033[0m  %s of %s skills missing from the roster:\n' "${#missing[@]}" "$total"
printf '        %s\n' "${missing[@]}"
printf '\nIf this is a fresh container, run .claude/hooks/session-start.sh first.\n'
exit 1
