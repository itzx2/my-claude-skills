#!/bin/bash
# Fixture tests for hooks/briefing.js.
#
# Every bug this guards against is a *silent* one: a wrong walk still emits a
# plausible-looking roster, just missing things. That is exactly how the
# synced/ gap survived unnoticed — the briefing looked fine and was short by
# seven skills. Assertions, not eyeballing.
#
# The briefing reads the plugin it ships in, found from its own location, so
# each fixture is a plugin folder holding a copy of the script.
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

# Registry paths are read by Node, which uses native Windows paths under Git
# Bash. Keep shell paths for shell operations and convert JSON path values.
native_path() { cygpath -m "$1" 2>/dev/null || printf '%s\n' "$1"; }

skill() { # <dir> <name> [disable]
  mkdir -p "$1/$2"
  { echo "---"; echo "name: $2"; echo "description: Test skill $2."
    [ "${3:-}" = "disable" ] && echo "disable-model-invocation: true"
    echo "---"; } > "$1/$2/SKILL.md"
}

plugin() { # <dir> <name>: a plugin folder carrying a copy of the briefing
  mkdir -p "$1/.claude-plugin" "$1/hooks" "$1/skills"
  printf '{"name":"%s","version":"0.0.0"}\n' "$2" > "$1/.claude-plugin/plugin.json"
  cp "$BRIEFING" "$1/hooks/briefing.js"
}

context() { node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  try { process.stdout.write(JSON.parse(s).hookSpecificOutput.additionalContext); }
  catch { process.stdout.write(""); }
});'; }

brief() { CLAUDE_CONFIG_DIR="$TMP/cfg" CLAUDE_PROJECT_DIR="$TMP/proj" node "$TMP/plug/hooks/briefing.js" | context; }

has()    { brief | grep -qF "$1"; }
hasnt()  { ! brief | grep -qF "$1"; }

# --- fixtures --------------------------------------------------------------
plugin "$TMP/plug" demo
mkdir -p "$TMP/plug/commands/group" "$TMP/cfg/skills" "$TMP/cfg/plugins" "$TMP/other/skills" "$TMP/proj/.claude/skills"

skill "$TMP/plug/skills" plug-skill
skill "$TMP/plug/skills" hidden-skill disable
# A container directory: no SKILL.md of its own, skills one level down.
skill "$TMP/plug/skills/grouped" nested-one
# A skill that itself contains subdirectories must not be descended into.
mkdir -p "$TMP/plug/skills/plug-skill/scripts" "$TMP/plug/skills/plug-skill/references"
printf -- '---\ndescription: A plugin command.\n---\n' > "$TMP/plug/commands/cmd-one.md"
printf -- '---\ndescription: A nested plugin command.\n---\n' > "$TMP/plug/commands/group/cmd-two.md"

# Everything outside the plugin, which the briefing must leave to others.
skill "$TMP/cfg/skills" loose-one
skill "$TMP/other/skills" other-skill
skill "$TMP/other/skills" other-hidden disable
skill "$TMP/proj/.claude/skills" project-skill
other_for_node="$(native_path "$TMP/other")"
echo "{\"plugins\":{\"other@market\":[{\"installPath\":\"$other_for_node\"}]}}" > "$TMP/cfg/plugins/installed_plugins.json"
echo '{}' > "$TMP/cfg/settings.json"

# --- assertions ------------------------------------------------------------
echo "== walk =="
has '`demo:plug-skill`'           && ok "plugin skill, namespaced"           || bad "plugin skill missing"
has '`/demo:hidden-skill`'        && ok "hidden plugin skill, user-invoked"  || bad "hidden skill missing"
has '`demo:cmd-one`'              && ok "plugin command"                     || bad "plugin command missing"
has '`demo:group:cmd-two`'        && ok "nested command keeps its namespace" || bad "nested command name wrong"
has '`demo:nested-one`'           && ok "container directory walked"         || bad "container directory NOT walked"
hasnt '`scripts`'                 && ok "skill subdirs not descended into"   || bad "descended into a skill's subdir"

echo "== naming rule =="
hasnt 'grouped:nested-one'        && ok "nesting never prefixes a skill"     || bad "directory leaked into skill name"

echo "== own plugin only =="
has '# Skills in the `demo` plugin' && ok "titled with its own plugin"       || bad "title does not name the plugin"
hasnt 'other-skill'               && ok "another plugin's skill left out"    || bad "another plugin was briefed"
hasnt 'other-hidden'              && ok "another plugin's hidden skill left out" || bad "another plugin's hidden skill was briefed"
hasnt 'loose-one'                 && ok "loose ~/.claude/skills left out"    || bad "a loose skill was briefed"
hasnt 'project-skill'             && ok "project .claude/skills left out"    || bad "a project skill was briefed"

echo "== legacy loose install =="
# install-skills.sh copies the script to ~/.claude/briefing.js beside
# ~/.claude/skills. With no plugin manifest above it, it briefs that folder bare.
mkdir -p "$TMP/loose/skills"
cp "$BRIEFING" "$TMP/loose/briefing.js"
skill "$TMP/loose/skills" bare-skill
skill "$TMP/loose/skills" bare-hidden disable
loose="$(node "$TMP/loose/briefing.js" | context)"
printf '%s' "$loose" | grep -qF '`/bare-hidden`' && ok "loose hidden skill, bare" || bad "loose hidden skill missing"
printf '%s' "$loose" | grep -qF '`bare-skill`'   && ok "loose skill, bare"        || bad "loose skill missing"

echo "== blind spots =="
has 'cannot see'                  && ok "roster declares its own limits"     || bad "roster still claims completeness"

echo "== context budget =="
# Claude Code caps hook context at 10,000 characters. Over that it writes the
# output to a file and hands the model only the path plus a 2,000-character
# preview, and never asks the model to read the file. So a roster that is merely
# a bit too long is not "a bit truncated": everything past 2,000 is gone. That is
# how the user-invoked section, the only place those skills appear, silently
# stopped reaching sessions once the roster grew past the cap.
budget() { # <briefing.js> <hidden-name>...
  local script="$1"; shift
  node "$script" | node -e '
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

# The real roster: this repo's own skills, briefed by the script in place.
real_hidden=$(grep -l '^disable-model-invocation: true' "$ROOT"/skills/*/SKILL.md | sed 's|.*/skills/||;s|/SKILL.md||;s|^|my-claude-skills:|')
msg=$(budget "$BRIEFING" $real_hidden) && ok "this repo's roster fits the cap, key parts in the preview" || bad "this repo's roster: $msg"

# Headroom: a roster twice today's size must still land. Growth is what broke it.
plugin "$TMP/big" big
long="Does a great deal of carefully described work across many situations, with caveats, edge cases, trigger phrases, and examples that make this description far longer than a roster line should ever need to be."
stress_hidden=""
for i in $(seq 1 70); do
  d="$TMP/big/skills/model-$i"; mkdir -p "$d"
  printf -- '---\nname: model-%s\ndescription: %s\n---\n' "$i" "$long" > "$d/SKILL.md"
done
for i in $(seq 1 30); do
  d="$TMP/big/skills/hidden-$i"; mkdir -p "$d"
  printf -- '---\nname: hidden-%s\ndescription: %s\ndisable-model-invocation: true\n---\n' "$i" "$long" > "$d/SKILL.md"
  stress_hidden="$stress_hidden big:hidden-$i"
done
msg=$(budget "$TMP/big/hooks/briefing.js" $stress_hidden) && ok "100-skill roster still fits, no hidden skill dropped" || bad "stress roster: $msg"
echo
printf '%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
