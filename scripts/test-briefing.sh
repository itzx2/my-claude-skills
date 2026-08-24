#!/bin/bash
# Fixture tests for hooks/briefing.js.
#
# Every bug this guards against is a *silent* one: a wrong walk still emits a
# plausible-looking roster, just missing things. That is exactly how the
# synced/ gap survived unnoticed — the briefing looked fine and was short by
# seven skills. Assertions, not eyeballing.
#
#   bash scripts/test-briefing.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
BRIEFING="$ROOT/hooks/briefing.js"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0; fail=0
ok()  { printf '  \033[32mok\033[0m    %s\n' "$1"; pass=$((pass + 1)); }
bad() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail + 1)); }

skill() { # <dir> <name> [disable]
  mkdir -p "$1/$2"
  { echo "---"; echo "name: $2"; echo "description: Test skill $2."
    [ "${3:-}" = "disable" ] && echo "disable-model-invocation: true"
    echo "---"; } > "$1/$2/SKILL.md"
}

brief() { CLAUDE_CONFIG_DIR="$TMP/cfg" node "$BRIEFING" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  try { process.stdout.write(JSON.parse(s).hookSpecificOutput.additionalContext); }
  catch { process.stdout.write(""); }
});'; }

has()    { brief | grep -qF "$1"; }
hasnt()  { ! brief | grep -qF "$1"; }

# --- fixtures --------------------------------------------------------------
mkdir -p "$TMP/cfg/plugins" "$TMP/cfg/skills" "$TMP/plug/skills" "$TMP/plug/commands" "$TMP/off/skills" "$TMP/proj/.claude/skills"

skill "$TMP/cfg/skills" loose-one
# A container directory: no SKILL.md of its own, skills one level down. This is
# the shape of ~/.claude/skills/synced.
skill "$TMP/cfg/skills/synced" nested-one
# A skill that itself contains subdirectories must not be descended into.
mkdir -p "$TMP/cfg/skills/loose-one/scripts" "$TMP/cfg/skills/loose-one/references"
skill "$TMP/plug/skills" plug-skill
skill "$TMP/plug/skills" hidden-skill disable
printf -- '---\ndescription: A plugin command.\n---\n' > "$TMP/plug/commands/cmd-one.md"
mkdir -p "$TMP/plug/commands/group"
printf -- '---\ndescription: A nested plugin command.\n---\n' > "$TMP/plug/commands/group/cmd-two.md"
skill "$TMP/off/skills" disabled-skill
skill "$TMP/proj/.claude/skills" project-skill
# Collision: the same bare name loose and in the plugin.
skill "$TMP/cfg/skills" plug-skill

cat > "$TMP/cfg/plugins/installed_plugins.json" <<JSON
{"plugins":{
  "demo@market":[{"installPath":"$TMP/plug"}],
  "offplug@market":[{"installPath":"$TMP/off"}]
}}
JSON
echo '{"enabledPlugins":{"offplug@market":false}}' > "$TMP/cfg/settings.json"

# --- assertions ------------------------------------------------------------
echo "== walk =="
has '`loose-one`'                 && ok "loose skill, bare name"            || bad "loose skill missing"
has '`nested-one`'                && ok "nested container walked (synced/)" || bad "nested container NOT walked"
has '`demo:plug-skill`'           && ok "plugin skill, namespaced"          || bad "plugin skill missing"
has '`/demo:hidden-skill`'        && ok "hidden plugin skill, user-invoked" || bad "hidden skill missing"
has '`demo:cmd-one`'              && ok "plugin command"                    || bad "plugin command missing"
has '`demo:group:cmd-two`'        && ok "nested command keeps its namespace" || bad "nested command name wrong"
hasnt '`scripts`'                 && ok "skill subdirs not descended into"  || bad "descended into a skill's subdir"
hasnt 'disabled-skill'            && ok "disabled plugin excluded"          || bad "disabled plugin was briefed"

echo "== naming rule =="
hasnt '`synced:nested-one`'       && ok "nesting never prefixes a skill"    || bad "directory leaked into skill name"

echo "== project scope =="
CLAUDE_PROJECT_DIR="$TMP/proj" bash -c '
  c=$(CLAUDE_CONFIG_DIR="'"$TMP"'/cfg" node "'"$BRIEFING"'" | node -e "let s=\"\";process.stdin.on(\"data\",d=>s+=d).on(\"end\",()=>{try{process.stdout.write(JSON.parse(s).hookSpecificOutput.additionalContext)}catch{}})")
  echo "$c" | grep -qF "\`project-skill\`" || exit 1
  echo "$c" | grep -qF "Available in this project only" || exit 2
' && ok "project skills briefed, in their own group" || bad "project scope not handled"
hasnt 'project-skill'             && ok "absent when no project dir is set"  || bad "project skill leaked without CLAUDE_PROJECT_DIR"

echo "== collisions =="
has 'Installed more than once'    && ok "duplicate detected"                || bad "duplicate NOT flagged"
has '`plug-skill`'                && ok "both invocations still listed"     || bad "a duplicate was silently dropped"

echo "== blind spots =="
has 'cannot see'                  && ok "roster declares its own limits"    || bad "roster still claims completeness"

echo
printf '%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
