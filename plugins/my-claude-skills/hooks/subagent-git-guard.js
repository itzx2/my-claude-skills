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
 * Blocked for subagents: push (every form), clean -f, branch -D (or delete
 * plus force), and checkout/restore of the whole tree (`.` or `./path`;
 * `restore --staged` only unstages and stays allowed). Absorbed from Matt
 * Pocock's git-guardrails-claude-code, minus `reset --hard`: implement-spec's
 * implementers reset their own worktree onto the integration branch, and
 * blocking that would stall every ticket. Node rather than his bash + jq,
 * because jq is usually missing on Windows and his script then allows
 * everything without a word.
 *
 * Both shell tools are watched, Bash and PowerShell, since a Windows subagent
 * has either. A command is split into words the way a shell would group them
 * (quotes hold a word together, `;`, `&`, `|`, parentheses and backticks end
 * a command), and every `git` word is checked, not just the first word, so
 * `time git push`, `(cd repo && git push)` and `git -C "My Repo" push` are
 * all caught. Text handed to a nested shell (`bash -c "..."`,
 * `powershell -Command "..."`, `eval`) is checked as a command line too;
 * a quoted commit message is not, so `git commit -m "then git push"` passes.
 * An unquoted `echo git push` is blocked: for a guard, wrongly blocking a
 * harmless line costs less than missing a real one.
 *
 * Unreadable input fails open, like the briefing: a guard that breaks must not
 * take the session's shell tools down with it.
 */

'use strict';

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
// Global options git reads before the subcommand that take a separate value.
const VALUE_OPTS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']);
// Words whose later arguments are themselves command lines.
const NESTED_SHELLS = /^(ba|z|da|k)?sh$|^pwsh$|^powershell$|^cmd$|^eval$/i;
const SEPARATORS = new Set([';', '&', '|', '(', ')', '`', '\n']);

const basename = (word) => word.split(/[\\/]/).pop().replace(/\.exe$/i, '');

// Split a command line into commands, each a list of words. Quotes group a
// word and are dropped; a backslash outside single quotes keeps the next
// character literal.
function commands(text) {
  const out = [];
  let words = [];
  let word = '';
  let inWord = false;
  let quote = null;
  const endWord = () => {
    if (inWord) words.push(word);
    word = '';
    inWord = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length) out.push(words);
    words = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < text.length) word += text[++i];
      else word += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
    } else if (ch === '\\' && i + 1 < text.length) {
      word += text[++i];
      inWord = true;
    } else if (SEPARATORS.has(ch)) {
      endCommand();
    } else if (/\s/.test(ch)) {
      endWord();
    } else {
      word += ch;
      inWord = true;
    }
  }
  endCommand();
  return out;
}

// A short-option cluster (`-df`) that includes the given letter.
const flag = (arg, letter) => /^-[a-zA-Z]+$/.test(arg) && arg.includes(letter);

function blocked(sub, args) {
  if (sub === 'push') return 'git push';
  if (sub === 'clean' && args.some((a) => a === '--force' || flag(a, 'f'))) return 'git clean -f';
  if (sub === 'branch') {
    const forceDelete = args.some((a) => flag(a, 'D'));
    const del = args.some((a) => a === '--delete' || flag(a, 'd'));
    const force = args.some((a) => a === '--force' || flag(a, 'f'));
    if (forceDelete || (del && force)) return 'git branch -D';
  }
  const wholeTree = args.some((a) => a === '.' || a.startsWith('./') || a.startsWith('.\\'));
  if (sub === 'checkout' && wholeTree) return 'git checkout .';
  if (sub === 'restore' && wholeTree) {
    const staged = args.some((a) => a === '--staged' || flag(a, 'S'));
    const worktree = args.some((a) => a === '--worktree' || flag(a, 'W'));
    if (!staged || worktree) return 'git restore .';
  }
  return null;
}

// The first blocked git call in a command line, or null.
function findBlocked(text, depth = 0) {
  for (const words of commands(text)) {
    for (let i = 0; i < words.length; i++) {
      if (basename(words[i]).toLowerCase() !== 'git') continue;
      let j = i + 1;
      while (j < words.length && words[j].startsWith('-')) j += VALUE_OPTS.has(words[j]) ? 2 : 1;
      const what = j < words.length && blocked(words[j], words.slice(j + 1));
      if (what) return what;
    }
    if (depth < 3 && words.some((w) => NESTED_SHELLS.test(basename(w)))) {
      for (const w of words) {
        const what = /\s/.test(w) && findBlocked(w, depth + 1);
        if (what) return what;
      }
    }
  }
  return null;
}

function main(raw) {
  let input;
  try { input = JSON.parse(raw); } catch { return 0; }
  if (!input || !input.agent_id || !SHELL_TOOLS.has(input.tool_name)) return 0;
  const command = String((input.tool_input && input.tool_input.command) || '');
  const what = findBlocked(command);
  if (!what) return 0;
  process.stderr.write(
    `BLOCKED: subagents may not run ${what} ("${command.trim()}"). ` +
      'Finish without it and say in your report that this step is left for the main session.\n',
  );
  return 2;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => process.exit(main(raw)));
