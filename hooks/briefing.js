#!/usr/bin/env node
/**
 * SessionStart hook: brief the agent on every skill installed *right now*.
 *
 * The problem this solves: Claude Code hides any skill with
 * `disable-model-invocation: true` from the agent's Skill listing completely.
 * The agent cannot discover them, so it cannot recommend them, so they may as
 * well not exist until the user happens to remember one. This hook walks what
 * is actually installed and writes those skills into the session's context.
 *
 * Roster sources, in order:
 *
 *   1. Every *enabled* plugin's `skills/` and `commands/` directories. Paths
 *      come from `plugins/installed_plugins.json` (authoritative for where a
 *      plugin landed, version included); enabled state comes from
 *      `settings.json`. Both directories matter — a plugin can ship behaviour
 *      as either, and Claude Code lists both.
 *   2. `~/.claude/skills/*` and `~/.claude/commands/*` — loose personal ones
 *      that belong to no plugin.
 *
 * Deliberately Node rather than bash+python: on Windows `bash` frequently
 * resolves to WSL (a different filesystem with a different $HOME) and
 * `python3` to the Microsoft Store stub, so a shell shim silently briefs
 * nothing. Node is one binary that behaves the same on every platform Claude
 * Code runs on.
 *
 * Failure must never block a session. Every step is best-effort; on any error
 * this exits 0 with no output, degrading to "no briefing" rather than
 * "session won't start".
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CLAUDE_DIR =
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

const DISABLE_KEY = 'disable-model-invocation';

/** Read and parse a JSON file, or return null. Never throws. */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** List subdirectory names of `dir`, or [] if it isn't a directory. */
function listDirs(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Parse the front matter of a SKILL.md into a flat key/value map.
 *
 * Not a YAML parser on purpose: skill front matter is flat `key: value` pairs,
 * and vendoring a YAML dependency into a hook is a reliability cost with no
 * upside. Handles the two quoting styles that occur in practice and folds
 * block scalars (`key: >-`) onto one line.
 */
function parseFrontMatter(file) {
  let lines;
  try {
    lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  } catch {
    return {};
  }

  if (!lines.length || lines[0].trim() !== '---') return {};

  const fields = {};
  let key = null;

  for (const line of lines.slice(1)) {
    if (line.trim() === '---') break;

    // Continuation of a block scalar or a wrapped value.
    if (key && /^[ \t]/.test(line) && !line.split('#')[0].includes(':')) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim();
      continue;
    }

    const idx = line.indexOf(':');
    if (idx === -1) continue;

    key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (['>', '>-', '|', '|-'].includes(value)) {
      // Block scalar introducer; the value arrives on following lines.
      value = '';
    } else if (
      value.length >= 2 &&
      value[0] === value[value.length - 1] &&
      (value[0] === '"' || value[0] === "'")
    ) {
      value = value.slice(1, -1);
    }

    fields[key] = value;
  }

  return fields;
}

const isTruthy = (v) => ['true', 'yes', '1'].includes(String(v).trim().toLowerCase());

/**
 * Trim a description to a roster-sized summary.
 *
 * Descriptions double as trigger lists, so they run long and often carry
 * parenthetical asides with their own punctuation. Only break on a terminator
 * at bracket depth zero that is followed by a fresh sentence.
 */
function firstSentence(text, limit = 160) {
  text = String(text || '').split(/\s+/).join(' ').trim();
  if (!text) return '';

  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
    else if ('.!?'.includes(c) && depth === 0 && i >= 30) {
      const rest = text.slice(i + 1);
      if (!rest) return text;
      // A terminator mid-token (version numbers, "e.g.") isn't a break.
      if (rest[0] === ' ' && /[A-Z]/.test(rest[1] || '')) return text.slice(0, i + 1);
    }
  }

  if (text.length > limit) return `${text.slice(0, limit).replace(/\s+\S*$/, '')}…`;
  return text;
}

/**
 * Collect skills from one `skills/` directory.
 *
 * `prefix` is the plugin's name, or null for loose personal skills. Claude Code
 * namespaces plugin-provided skills as `plugin:skill` and leaves personal ones
 * bare, so the prefix decides the invocation string the agent must use — the
 * single most important thing this briefing gets right.
 */
function collect(skillsDir, prefix, source, out) {
  for (const entry of listDirs(skillsDir)) {
    const skillMd = path.join(skillsDir, entry, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;

    const fields = parseFrontMatter(skillMd);
    const name = fields.name || entry;
    const description = String(fields.description || '').split(/\s+/).join(' ').trim();
    const qualified = prefix ? `${prefix}:${name}` : name;

    const bucket = isTruthy(fields[DISABLE_KEY]) ? out.userInvoked : out.modelInvocable;
    bucket.push({ qualified, description, source });
  }
}

/**
 * Collect slash commands from one `commands/` directory.
 *
 * A plugin can ship behaviour as either a skill (a directory holding SKILL.md)
 * or a command (a single .md file), and Claude Code surfaces both in the agent's
 * Skill listing. Reading only `skills/` misses whole plugins: diagram-design,
 * for instance, ships one skill and three commands.
 *
 * A command's name is its filename; nested directories namespace it further, so
 * `commands/foo/bar.md` in plugin `p` is `p:foo:bar`.
 */
function collectCommands(commandsDir, prefix, source, out, trail = []) {
  let entries;
  try {
    entries = fs.readdirSync(commandsDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(commandsDir, entry.name);

    if (entry.isDirectory()) {
      collectCommands(full, prefix, source, out, [...trail, entry.name]);
      continue;
    }
    if (!entry.name.endsWith('.md')) continue;

    const fields = parseFrontMatter(full);
    const name = [...trail, entry.name.slice(0, -3)].join(':');
    const description = String(fields.description || '').split(/\s+/).join(' ').trim();
    const qualified = prefix ? `${prefix}:${name}` : name;

    const bucket = isTruthy(fields[DISABLE_KEY]) ? out.userInvoked : out.modelInvocable;
    bucket.push({ qualified, description, source });
  }
}

/** Build the roster from every enabled plugin plus loose personal skills. */
function buildRoster() {
  const out = { modelInvocable: [], userInvoked: [] };

  const installed = readJson(path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json'));
  const settings = readJson(path.join(CLAUDE_DIR, 'settings.json')) || {};
  const enabled = settings.enabledPlugins || {};

  if (installed && installed.plugins) {
    for (const [id, entries] of Object.entries(installed.plugins)) {
      // A plugin explicitly switched off contributes nothing to the session.
      if (enabled[id] === false) continue;
      if (!Array.isArray(entries) || !entries.length) continue;

      // Multiple entries mean multiple scopes; the last one installed wins,
      // which matches how Claude Code resolves them.
      const installPath = entries[entries.length - 1].installPath;
      if (!installPath) continue;

      const pluginName = id.split('@')[0];
      collect(path.join(installPath, 'skills'), pluginName, pluginName, out);
      collectCommands(path.join(installPath, 'commands'), pluginName, pluginName, out);
    }
  }

  // Loose skills and commands live directly under ~/.claude and carry no prefix.
  collect(path.join(CLAUDE_DIR, 'skills'), null, 'personal', out);
  collectCommands(path.join(CLAUDE_DIR, 'commands'), null, 'personal', out);

  return out;
}

function render({ modelInvocable, userInvoked }) {
  const lines = [
    '# Skills installed in this session',
    '',
    'Built at session start from the plugins actually installed on this machine, ' +
      'plus any loose skills in `~/.claude/skills`. This roster is current; a ' +
      'skill absent from it is not installed.',
    '',
    'These encode how this user wants recurring work done, so prefer a matching ' +
      'skill over improvising your own approach.',
    '',
  ];

  if (modelInvocable.length) {
    lines.push(
      '## Model-invocable — you may call these yourself',
      '',
      'Already in your Skill tool listing with full descriptions. Invoke via `Skill` ' +
        'as soon as a request matches one, without asking permission first. The list ' +
        'below is a recall aid, not the authoritative trigger text.',
      '',
      ...modelInvocable.map(({ qualified, description }) =>
        description ? `- \`${qualified}\` — ${firstSentence(description)}` : `- \`${qualified}\``
      ),
      ''
    );
  }

  if (userInvoked.length) {
    lines.push(
      '## User-invoked only — recommend, do not start',
      '',
      'These set `disable-model-invocation: true`, so Claude Code hides them from ' +
        'your Skill listing entirely. **This section is the only place you learn ' +
        'they exist.** Never start one on your own initiative. Recommending them is ' +
        'the whole point of listing them, and the user has asked explicitly to hear ' +
        'about any skill that fits: when one does, name it in a sentence and let ' +
        'them decide — e.g. "`/my-claude-skills:to-tickets` would break this plan ' +
        'into tickets if you want it." The test is simple: would running this right ' +
        'now plausibly help with what the user is doing? Surface every skill that ' +
        'passes, not just the best one. When you cannot tell, say it anyway — a ' +
        'suggestion they skip costs one line, while a skill they never hear about is ' +
        'one they can never use.',
      '',
      ...userInvoked.map(({ qualified, description }) =>
        description ? `- \`/${qualified}\` — ${description}` : `- \`/${qualified}\``
      ),
      ''
    );
  }

  lines.push(
    'Invocation names above are exact, including any `plugin:` prefix — Claude Code ' +
      'namespaces plugin-provided skills and leaves loose personal ones bare. Use the ' +
      'name as written.',
    '',
    'When the user types `/<name>` for any skill above — including the user-invoked ' +
      'ones — that is them starting it, so invoke it via `Skill` with that exact ' +
      'name. The restriction is on you starting one unprompted, not on running one ' +
      'they asked for.'
  );

  return lines.join('\n');
}

function main() {
  const roster = buildRoster();
  if (!roster.modelInvocable.length && !roster.userInvoked.length) return 0;

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: render(roster),
      },
    })}\n`
  );
  return 0;
}

try {
  process.exit(main());
} catch {
  // A broken briefing must never cost the user a session.
  process.exit(0);
}
