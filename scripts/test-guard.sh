#!/bin/bash
# Fixture tests for hooks/subagent-git-guard.js: which git commands a subagent
# may run, and that the main session is never blocked.
#
#   bash scripts/test-guard.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
GUARD="$ROOT/hooks/subagent-git-guard.js"
pass=0; fail=0
ok()  { printf '  \033[32mok\033[0m    %s\n' "$1"; pass=$((pass + 1)); }
bad() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail + 1)); }

# case <who: sub|main> <expect: allow|block> <command> [tool: Bash|PowerShell]
case_() {
  local who="$1" want="$2" cmd="$3" tool="${4:-Bash}" input code
  input=$(WHO="$who" CMD="$cmd" TOOL="$tool" node -e '
    const e = { session_id: "s", hook_event_name: "PreToolUse", tool_name: process.env.TOOL, tool_input: { command: process.env.CMD } };
    if (process.env.WHO === "sub") { e.agent_id = "a1"; e.agent_type = "general-purpose"; }
    process.stdout.write(JSON.stringify(e));')
  printf '%s' "$input" | node "$GUARD" >/dev/null 2>&1
  code=$?
  local got=allow; [ "$code" -eq 2 ] && got=block
  [ "$got" = "$want" ] && ok "$who $want ($tool): $cmd" || bad "$who ($tool) $cmd: wanted $want, got $got (exit $code)"
}

echo "== subagents are blocked =="
case_ sub block 'git push'
case_ sub block 'git push --force origin main'
case_ sub block 'git -C ../repo push origin HEAD'
case_ sub block 'git status && git push'
case_ sub block 'cd repo; git push -u origin feat'
case_ sub block 'git clean -fd'
case_ sub block 'git clean -f'
case_ sub block 'git branch -D old-feature'
case_ sub block 'git checkout .'
case_ sub block 'git checkout -- .'
case_ sub block 'git restore .'

echo "== ...however the command is wrapped =="
case_ sub block 'git -C "F:/My Repo" push'
case_ sub block '(cd repo && git push)'
case_ sub block '(git push)'
case_ sub block 'time git push'
case_ sub block 'env X=1 git push'
case_ sub block 'sudo git push'
case_ sub block 'bash -c "git push"'
case_ sub block 'powershell -Command "git push origin main"'
case_ sub block 'git branch --delete --force old'
case_ sub block 'git branch -df old'
case_ sub block 'git checkout ./src'
case_ sub block 'git push origin main' PowerShell
case_ sub block 'Set-Location repo; git push' PowerShell

echo "== subagents keep everything else =="
case_ sub allow 'git commit -m "wip; git push later"'
case_ sub allow 'git restore --staged .'
case_ sub allow 'git checkout -b feature/x'
case_ sub allow 'git log --grep=push'
case_ sub allow 'git status' PowerShell
case_ sub allow 'git reset --hard integration'
case_ sub allow 'git status'
case_ sub allow 'git commit -m "push the fix"'
case_ sub allow 'git clean -n'
case_ sub allow 'git branch -d merged-feature'
case_ sub allow 'git checkout main'
case_ sub allow 'git restore src/app.ts'
case_ sub allow 'echo "git push"'
case_ sub allow 'npm test'

echo "== the main session is never blocked =="
case_ main allow 'git push --force origin main'
case_ main allow 'git clean -fd'
case_ main allow 'git branch -D old-feature'
case_ main allow 'git push' PowerShell

echo "== bad input fails open =="
printf 'not json' | node "$GUARD" >/dev/null 2>&1 && ok "unparseable input allowed" || bad "unparseable input blocked"
printf '{"tool_name":"Edit","agent_id":"a1","tool_input":{}}' | node "$GUARD" >/dev/null 2>&1 \
  && ok "non-Bash tool allowed" || bad "non-Bash tool blocked"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
