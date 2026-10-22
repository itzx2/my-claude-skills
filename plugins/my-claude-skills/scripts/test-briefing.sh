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


echo "== context budget =="
# Claude Code caps hook context at 10,000 characters. Over that it writes the
# output to a file and hands the model only the path plus a 2,000-character
# preview, and never asks the model to read the file. So a roster that is merely
# a bit too long is not "a bit truncated": everything past 2,000 is gone. That is
# how the user-invoked section, the only place those skills appear, silently
# stopped reaching sessions once the roster grew past the cap.
budget() { # <label> <config-dir> <hidden-name>...
  local label="$1" cfg="$2"; shift 2
  CLAUDE_CONFIG_DIR="$cfg" node "$BRIEFING" | node -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
      let c=""; try { c = JSON.parse(s).hookSpecificOutput.additionalContext; } catch {}
      const hidden = process.argv.slice(1), fails = [];
      if (!c) fails.push("no briefing");
      if (c.length > 10000) fails.push(`${c.length} chars, over the 10,000 cap`);
      const ui = c.indexOf("## User-invoked");
      if (ui < 0 || ui > 2000) fails.push(`user-invoked section at ${ui}, outside the 2,000 preview`);
      const rule = c.indexOf("even when it is absent from your Skill listing");
      if (rule < 0 || rule > 2000) fails.push(`/name rule at ${rule}, outside the 2,000 preview`);
      const lost = hidden.filter(h => !c.includes("`/" + h + "`"));
      if (lost.length) fails.push(`lost ${lost.length} hidden skill(s): ${lost.slice(0,3).join(", ")}`);
      console.log(fails.join("; ")); process.exit(fails.length ? 1 : 0);
    });' "$@"
}

# The real roster: this repo's own skills, installed as the plugin.
mkdir -p "$TMP/real/plugins"
# node reads this path, so on Git Bash it must be a drive path, not /d/...
root_for_node=$(cygpath -m "$ROOT" 2>/dev/null || echo "$ROOT")
echo "{\"plugins\":{\"my-claude-skills@my-claude-skills\":[{\"installPath\":\"$root_for_node\"}]}}" > "$TMP/real/plugins/installed_plugins.json"
echo '{}' > "$TMP/real/settings.json"
real_hidden=$(grep -l '^disable-model-invocation: true' "$ROOT"/skills/*/SKILL.md | sed 's|.*/skills/||;s|/SKILL.md||;s|^|my-claude-skills:|')
msg=$(budget real "$TMP/real" $real_hidden) && ok "this repo's roster fits the cap, key parts in the preview" || bad "this repo's roster: $msg"

# Headroom: a roster twice today's size must still land. Growth is what broke it.
mkdir -p "$TMP/big/plugins" "$TMP/bigplug/skills"
long="Does a great deal of carefully described work across many situations, with caveats, edge cases, trigger phrases, and examples that make this description far longer than a roster line should ever need to be."
stress_hidden=""
for i in $(seq 1 70); do
  d="$TMP/bigplug/skills/model-$i"; mkdir -p "$d"
  printf -- '---\nname: model-%s\ndescription: %s\n---\n' "$i" "$long" > "$d/SKILL.md"
done
for i in $(seq 1 30); do
  d="$TMP/bigplug/skills/hidden-$i"; mkdir -p "$d"
  printf -- '---\nname: hidden-%s\ndescription: %s\ndisable-model-invocation: true\n---\n' "$i" "$long" > "$d/SKILL.md"
  stress_hidden="$stress_hidden big:hidden-$i"
done
echo "{\"plugins\":{\"big@market\":[{\"installPath\":\"$TMP/bigplug\"}]}}" > "$TMP/big/plugins/installed_plugins.json"
echo '{}' > "$TMP/big/settings.json"
msg=$(budget stress "$TMP/big" $stress_hidden) && ok "100-skill roster still fits, no hidden skill dropped" || bad "stress roster: $msg"
echo
printf '%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
