#!/usr/bin/env node
/**
 * SessionStart hook: brief the agent on this plugin's own skills.
 *
 * The problem this solves: Claude Code hides any skill with
 * `disable-model-invocation: true` from the agent's Skill listing completely.
 * The agent cannot discover them, so it cannot recommend them, so they may as
 * well not exist until the user happens to remember one. This hook walks the
 * plugin it ships in and writes those skills into the session's context.
 *
 * The roster is this plugin only: its `skills/` and `commands/` directories,
 * read from the folder this script sits in. Both directories matter — a plugin
 * can ship behaviour as either, and Claude Code lists both. Every plugin briefs
 * its own skills (my-roblox-skills ships its own briefing), so no briefing
 * restates another's.
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
const path = require('path');

// The plugin this script ships in. __dirname rather than $CLAUDE_PLUGIN_ROOT,
// so the script still works when an installing hook or the README runs it by
// hand from the plugin cache.
const PLUGIN_ROOT = path.resolve(__dirname, '..');

// The legacy loose install (scripts/install-skills.sh) copies this script to
// ~/.claude/briefing.js beside ~/.claude/skills, where this repo's skills sit
// unprefixed. With no plugin manifest above it, that folder is what it briefs.
const LOOSE_ROOT = __dirname;

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
 * `prefix` is the plugin's name. Claude Code namespaces plugin-provided skills
 * as `plugin:skill`, so the prefix decides the invocation string the agent must
 * use — the single most important thing this briefing gets right.
 *
 * Recurses, because a skills directory can hold *container* directories rather
 * than skills, when a plugin groups its own. A directory holding SKILL.md is a
 * skill and is never descended into; anything else is a container and is walked.
 *
 * Note the deliberate asymmetry with collectCommands(): nesting there *does*
 * build the name (`commands/foo/bar.md` is `foo:bar`), and here it never does.
 * That is not an oversight. Claude Code flattens the skills tree, so a grouped
 * `group/xlsx` is invoked as `plugin:xlsx`; only the plugin's identity ever
 * contributes a prefix.
 */
function collect(skillsDir, prefix, source, out, depth = 0) {
  // A guard against a pathological tree, not a real layout limit: two levels
  // already covers any plugin that groups its skills.
  if (depth > 2) return;

  for (const entry of listDirs(skillsDir)) {
    const dir = path.join(skillsDir, entry);
    const skillMd = path.join(dir, 'SKILL.md');

    if (!fs.existsSync(skillMd)) {
      collect(dir, prefix, source, out, depth + 1);
      continue;
    }

    const fields = parseFrontMatter(skillMd);
    const name = fields.name || entry;
    const description = String(fields.description || '').split(/\s+/).join(' ').trim();
    const qualified = prefix ? `${prefix}:${name}` : name;

    const bucket = isTruthy(fields[DISABLE_KEY]) ? out.userInvoked : out.modelInvocable;
    bucket.push({ name, qualified, description, source });
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
    bucket.push({ name, qualified, description, source });
  }
}

/**
 * Build the roster from this plugin's own skills and commands, or, in the
 * legacy loose install, from the `skills/` and `commands/` beside the script.
 * `scope` names what was walked, for the rendered heading and blind spot.
 */
function buildRoster() {
  const out = { modelInvocable: [], userInvoked: [] };
  const manifest = readJson(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));
  const root = manifest ? PLUGIN_ROOT : LOOSE_ROOT;
  const prefix = manifest ? manifest.name || path.basename(PLUGIN_ROOT) : null;
  out.scope = prefix ? `the \`${prefix}\` plugin` : 'the loose `~/.claude/skills` install';
  collect(path.join(root, 'skills'), prefix, prefix || 'personal', out);
  collectCommands(path.join(root, 'commands'), prefix, prefix || 'personal', out);
  return out;
}

/** Render one bucket as a list. */
function renderGroup(entries, fmt, describe) {
  return entries.map(({ qualified, description }) =>
    description && describe ? `- ${fmt(qualified)} — ${describe(description)}` : `- ${fmt(qualified)}`
  );
}

/**
 * Claude Code caps hook context at 10,000 characters. Over that, the model gets
 * the file path and a 2,000-character preview instead, and nothing asks it to
 * open the file — so "slightly too long" means "everything past 2,000 is gone".
 * That is how the user-invoked section, the only place those skills appear,
 * stopped reaching sessions once the roster outgrew the cap.
 *
 * Two defences, both needed: stay under the cap with margin, and put what must
 * survive regardless — the /name rule and the user-invoked section — inside the
 * first 2,000 characters. scripts/test-briefing.sh asserts both.
 */
const BUDGET = 9500;

function render(roster) {
  // Shrink only what is safe to lose, in order, until it fits: user-invoked
  // descriptions first, then the model-invocable list's line breaks. Names are
  // never dropped — a hidden skill left out is a hidden skill nobody can use.
  const steps = [[140, false], [90, false], [50, false], [0, false], [0, true]];
  let out = '';
  for (const [limit, compact] of steps) {
    out = renderAt(roster, limit, compact);
    if (out.length <= BUDGET) break;
  }
  return out;
}

function renderAt({ scope, modelInvocable, userInvoked }, limit, compact) {
  const lines = [
    `# Skills in ${scope}`,
    '',
    `Built at session start from ${scope}'s own folder. They encode ` +
      'how this user wants recurring work done, so prefer a matching skill over ' +
      'improvising.',
    '',
    '**When the user types `/<name>`, invoke it via `Skill` with that exact name, ' +
      'even when it is absent from your Skill listing.** The user-invoked skills ' +
      'below are hidden from that listing by design. Never tell the user one does ' +
      'not exist, and never substitute a similar visible name for it.',
    '',
  ];

  if (userInvoked.length) {
    const describe = limit ? (d) => firstSentence(d, limit) : null;
    lines.push(
      '## User-invoked only — recommend, do not start',
      '',
      'These set `disable-model-invocation: true`, so this section is the only place ' +
        'you learn they exist. Never start one yourself. When one would plausibly help ' +
        'with what the user is doing, name it in a sentence and let them decide — a ' +
        'skipped suggestion costs one line; an unmentioned skill is never used.',
      '',
      ...renderGroup(userInvoked, (q) => `\`/${q}\``, describe),
      ''
    );
  }

  if (modelInvocable.length) {
    lines.push(
      '## Model-invocable — you may call these yourself',
      '',
      'Already in your Skill tool listing with full descriptions, which is the ' +
        'authoritative trigger text. Invoke via `Skill` as soon as a request matches.',
      ''
    );
    if (compact) {
      lines.push(modelInvocable.map((e) => `\`${e.qualified}\``).join(', '), '');
    } else {
      lines.push(...renderGroup(modelInvocable, (q) => `\`${q}\``, null), '');
    }
  }

  lines.push(
    `**What this roster cannot see:** everything outside ${scope}. Other plugins ` +
      'brief their own skills, and the rest that you may invoke are in your Skill ' +
      `listing. An absent name here means "not in ${scope}", never "does not exist".`,
    '',
    'Names above are exact, including any `plugin:` prefix. Use them as written.'
  );

  return lines.join('\n');
}

/**
 * No `reloadSkills` in the payload, deliberately.
 *
 * The retired `skills-briefing.py` set it because the same hook *installed*
 * skills moments earlier, so the session had to re-scan to see them. This hook
 * installs nothing: the plugin is already in place before it runs, and Claude
 * Code has enumerated it. Adding the flag back would only cost a re-scan.
 */
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
