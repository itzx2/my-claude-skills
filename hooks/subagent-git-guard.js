#!/usr/bin/env node
/**
 * PreToolUse hook: stop subagents from running git commands that publish or
 * destroy work, and leave the main session alone.
 *
 * Claude Code puts `agent_id` in a hook's input only when the call comes from
 * inside a subagent, so its absence means the main session: the one you are
 * talking to, which this never blocks. A subagent asked to push, delete a
 * branch, or wipe its tree gets exit 2 and a message saying to hand that step
 * back to the main session.
 *
 * Blocked for subagents: push (every form), clean -f, branch -D, and
 * checkout/restore of the whole tree (`.`). Absorbed from Matt Pocock's
 * git-guardrails-claude-code, minus `reset --hard`: implement-spec's
 * implementers reset their own worktree onto the integration branch, and
 * blocking that would stall every ticket. Node rather than his bash + jq,
 * because jq is usually missing on Windows and his script then allows
 * everything without a word.
 *
 * Unreadable input fails open, like the briefing: a guard that breaks must not
 * take the session's Bash tool down with it.
 */

'use strict';

// Global options git reads before the subcommand that take a separate value.
const VALUE_OPTS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']);

// The git subcommand and its arguments in one shell segment, or null.
function gitCall(segment) {
  const tokens = segment.trim().split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++; // FOO=bar git ...
  const exe = tokens[i] || '';
  if (!/(^|[\\/])git(\.exe)?$/.test(exe)) return null;
  i++;
  while (i < tokens.length && tokens[i].startsWith('-')) i += VALUE_OPTS.has(tokens[i]) ? 2 : 1;
  return i < tokens.length ? { sub: tokens[i], args: tokens.slice(i + 1) } : null;
}

function blocked({ sub, args }) {
  if (sub === 'push') return 'git push';
  if (sub === 'clean' && args.some((a) => a === '--force' || /^-[^-]*f/.test(a))) return 'git clean -f';
  if (sub === 'branch' && args.some((a) => /^-[a-zA-Z]*D/.test(a))) return 'git branch -D';
  if ((sub === 'checkout' || sub === 'restore') && args.includes('.')) return `git ${sub} .`;
  return null;
}

function main(raw) {
  let input;
  try { input = JSON.parse(raw); } catch { return 0; }
  if (!input || !input.agent_id || input.tool_name !== 'Bash') return 0;
  const command = String((input.tool_input && input.tool_input.command) || '');
  for (const segment of command.split(/&&|\|\||[;|&\n]/)) {
    const call = gitCall(segment);
    const what = call && blocked(call);
    if (what) {
      process.stderr.write(
        `BLOCKED: subagents may not run ${what} ("${segment.trim()}"). ` +
          'Finish without it and say in your report that this step is left for the main session.\n',
      );
      return 2;
    }
  }
  return 0;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => process.exit(main(raw)));
