#!/usr/bin/env node
/**
 * SessionStart and SubagentStart hook: brief every agent on the Roblox skills.
 *
 * The 29 domain skills are model-invocable, so their descriptions already sit
 * in each agent's Skill listing. What a listing cannot carry is the route:
 * which skill comes first, which domain owns a question, and that the plugin's
 * user-invoked skills, such as `/my-roblox-skills:ask-roblox`, exist at all
 * (they are hidden from the listing). A subagent never sees the main session's
 * SessionStart context, so the same briefing is injected at SubagentStart too.
 *
 * How much is said depends on the folder. In something that looks like a
 * Roblox project the agent gets the full route; anywhere else it gets a
 * two-line pointer, because Roblox work also happens through a Studio MCP
 * bridge with no repository open.
 *
 * The full route inlines only what every Roblox task needs: the first skill
 * and the ownership rules. Groups and combinations serve only multi-domain
 * tasks, so they stay in the router's ROUTES.md behind a pointer. The count
 * comes from the skills on disk, and the first skill and the ownership rules
 * from ROUTES.md itself, so the briefing restates nothing it could drift from.
 * The user-invoked skills are likewise read from their front matter on disk.
 *
 * The full route also points at the project's Roblox standards: the
 * `CODING_STANDARDS.md` at the project root when there is one, or else a
 * suggestion to run the setup skill that writes it. Some subagents start
 * without project instructions, so this line is their route to the standards.
 *
 * Failure must never block a session or a subagent: on any error this exits 0
 * with no output.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// The plugin this script ships in. __dirname rather than $CLAUDE_PLUGIN_ROOT,
// matching hooks/briefing.js in my-claude-skills, so a hand run from the
// plugin cache briefs the same plugin a hook run does.
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const ROUTES = path.join(PLUGIN_ROOT, 'skills', 'ask-roblox', 'ROUTES.md');
const STANDARDS = 'CODING_STANDARDS.md';
const SETUP_SKILL = 'setup-roblox-standards';

/**
 * Files whose presence marks a Roblox project: the Roblox package and
 * toolchain managers. Rojo project files (`*.project.json`) and saved places
 * or models are matched by suffix.
 */
const MARKER_FILES = ['wally.toml', 'pesde.toml', 'rokit.toml', 'aftman.toml', 'foreman.toml'];
const MARKER_EXTENSIONS = ['.rbxl', '.rbxlx', '.rbxm', '.rbxmx'];

/** Read all of stdin, or '' when there is none (a hand run from a terminal). */
function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** Read and parse a JSON file, or return null. Never throws. */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Directory entries of `dir`, or [] if it isn't a readable directory. */
function listEntries(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** The plugin's model-invocable domain skills, by folder name. */
function domainSkills() {
  return listEntries(path.join(PLUGIN_ROOT, 'skills'))
    .filter((e) => e.isDirectory() && e.name.startsWith('roblox-'))
    .filter((e) => fs.existsSync(path.join(PLUGIN_ROOT, 'skills', e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort();
}

/**
 * The flat `key: value` front matter of a SKILL.md, or {}.
 *
 * Not a YAML parser, matching hooks/briefing.js in my-claude-skills: skill
 * front matter is flat pairs. Strips one level of quotes and folds block
 * scalars and wrapped values onto one line.
 */
function frontMatter(file) {
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
    if (key && /^[ \t]/.test(line) && !line.split('#')[0].includes(':')) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim();
      continue;
    }
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (['>', '>-', '|', '|-'].includes(value)) value = '';
    else if (value.length >= 2 && value[0] === value[value.length - 1] && `"'`.includes(value[0])) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  return fields;
}

/**
 * The plugin's user-invoked skills (front matter sets
 * `disable-model-invocation: true`), as `{ name, summary }` sorted by name. The
 * summary is the description's first sentence.
 */
function userInvokedSkills() {
  const out = [];
  for (const e of listEntries(path.join(PLUGIN_ROOT, 'skills'))) {
    if (!e.isDirectory()) continue;
    const fields = frontMatter(path.join(PLUGIN_ROOT, 'skills', e.name, 'SKILL.md'));
    if (!['true', 'yes', '1'].includes(String(fields['disable-model-invocation']).trim().toLowerCase())) continue;
    const description = String(fields.description || '').split(/\s+/).join(' ').trim();
    const summary = (description.match(/^.*?[.!?](?=\s|$)/) || [description])[0];
    out.push({ name: e.name, summary });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Why `start` looks like a Roblox project, and the project root.
 *
 * `reasons` is [] when it does not look like one. Walks up from `start` to the
 * repository root (the first directory holding `.git`), so a session opened in
 * `src/server` still counts; that directory is the `root`, or `start` itself
 * when the walk finds no `.git`. The walk never
 * reaches the home directory or anything above it: a stray place file saved in
 * the home folder would otherwise put every folder under it in full mode. Each
 * level is checked for marker files, `*.project.json`, and saved places. Luau
 * sources are searched only below `start`, two levels deep and capped, so a
 * huge non-Roblox tree costs a bounded number of reads.
 */
function detect(start) {
  const reasons = new Set();
  const home = path.resolve(os.homedir());
  let dir = path.resolve(start);
  let root = dir;

  for (let level = 0; level < 8; level++) {
    if (level > 0 && isAtOrAbove(dir, home)) break;
    for (const entry of listEntries(dir)) {
      if (!entry.isFile()) continue;
      const name = entry.name.toLowerCase();
      if (MARKER_FILES.includes(name) || name.endsWith('.project.json')) reasons.add(entry.name);
      else if (MARKER_EXTENSIONS.includes(path.extname(name))) reasons.add(`*${path.extname(name)}`);
    }
    if (fs.existsSync(path.join(dir, '.git'))) {
      root = dir;
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  if (!reasons.size && hasLuau(path.resolve(start), 0, { seen: 0 })) reasons.add('*.luau sources');
  return { reasons: [...reasons].sort(), root };
}

/** Whether `dir` is `home` or one of its ancestors. */
function isAtOrAbove(dir, home) {
  const rel = path.relative(dir, home);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

const SKIP = new Set(['.git', 'node_modules', 'Packages', 'DevPackages', 'ServerPackages']);

function hasLuau(dir, depth, budget) {
  if (depth > 2) return false;
  for (const entry of listEntries(dir)) {
    if (++budget.seen > 400) return false;
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.luau') return true;
    if (entry.isDirectory() && !SKIP.has(entry.name) && hasLuau(path.join(dir, entry.name), depth + 1, budget)) {
      return true;
    }
  }
  return false;
}

/**
 * The body of one `## <heading>` section of ROUTES.md, the single source the
 * router and this briefing share. It runs to the next heading or the closing
 * `---` rule, so a section works wherever it sits in the file. '' when the
 * file or the section is missing.
 */
function routesSection(heading) {
  let text;
  try {
    text = fs.readFileSync(ROUTES, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return '';
  }
  const lines = text.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  if (start < 0) return '';
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ') || line.trim() === '---') break;
    body.push(line);
  }
  return body.join('\n').trim();
}

/**
 * The standards line: a pointer to `CODING_STANDARDS.md` at the project root,
 * or a suggestion to run the setup skill when it is missing. Naming the file is
 * enough even when it only points at another document: one read leads there.
 * '' when there is neither, so the briefing never suggests a skill not on disk.
 */
function standardsLine(plugin, invoked, root) {
  const file = path.join(root, STANDARDS);
  if (fs.existsSync(file)) {
    return `**This project's Roblox standards** are in \`${file.replace(/\\/g, '/')}\`: follow them ` +
      'when writing Luau, and review against them.';
  }
  if (!invoked.some((s) => s.name === SETUP_SKILL)) return '';
  return `**This project has no Roblox standards** (no \`${STANDARDS}\` at its root): suggest the user ` +
    `run \`/${plugin}:${SETUP_SKILL}\` to write them.`;
}

function fullBriefing(plugin, skills, invoked, { reasons, root }, subagent) {
  const invocation = (name) => `\`${plugin}:${name}\``;
  const first = (routesSection('First').match(/`(roblox-[a-z-]+)`/) || [])[1];
  const lines = [
    '# Roblox skills',
    '',
    `This folder is a Roblox project (${reasons.join(', ')}), and \`${plugin}\` holds ` +
      `${skills.length} Roblox domain skills, all in your Skill listing.`,
    '',
    first
      ? `**Every Roblox task starts with ${invocation(first)}**, then the domain skills that ` +
        'own its questions, loaded before writing or judging Roblox code.'
      : '**Every Roblox task loads the domain skills that own its questions** before ' +
        'writing or judging Roblox code.',
  ];

  const standards = standardsLine(plugin, invoked, root);
  if (standards) lines.push('', standards);

  if (subagent) lines.push('', 'Your brief may name no domain skills; choose them from your task.');

  const owners = routesSection('Owners');
  if (owners) lines.push('', '## Owners', '', 'When two domains touch one question, the owner decides:', '', owners);

  lines.push(
    '',
    `**When a task spans several domains**, read \`${ROUTES.replace(/\\/g, '/')}\` for the ` +
      'domain groups and the combinations common problems need.'
  );

  if (invoked.length) {
    lines.push(
      '',
      `\`${plugin}\` also has these user-invoked skills. They are absent from your Skill listing ` +
        'and only the user can start them, so suggest one when it fits:',
      '',
      ...invoked.map((s) => `- \`/${plugin}:${s.name}\`${s.summary ? ` — ${s.summary}` : ''}`)
    );
  }
  return lines.join('\n');
}

function pointerBriefing(plugin, skills, invoked) {
  const first = (routesSection('First').match(/`(roblox-[a-z-]+)`/) || [])[1];
  const start = first ? `start with \`${plugin}:${first}\`` : 'load the domain skills the task touches';
  const lines = [
    `\`${plugin}\` holds ${skills.length} Roblox domain skills (\`${plugin}:roblox-*\`); this folder ` +
      `is not a Roblox project, so for Roblox work here, such as Studio through MCP, ${start}.`,
  ];
  if (invoked.length) {
    lines.push(
      `Its user-invoked skills are ${invoked.map((s) => `\`/${plugin}:${s.name}\``).join(', ')}: ` +
        'suggest one when it fits, since only the user can start them.'
    );
  }
  return lines.join('\n');
}

function main() {
  let input = {};
  try {
    input = JSON.parse(readStdin() || '{}');
  } catch {
    input = {};
  }

  const event = input.hook_event_name === 'SubagentStart' ? 'SubagentStart' : 'SessionStart';
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  const skills = domainSkills();
  if (!skills.length) return 0;

  const manifest = readJson(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json')) || {};
  const plugin = manifest.name || path.basename(PLUGIN_ROOT);

  const invoked = userInvokedSkills();
  const detection = detect(cwd);
  const context = detection.reasons.length
    ? fullBriefing(plugin, skills, invoked, detection, event === 'SubagentStart')
    : pointerBriefing(plugin, skills, invoked);

  process.stdout.write(
    `${JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } })}\n`
  );
  return 0;
}

try {
  process.exit(main());
} catch {
  // A broken briefing must never cost the user a session or a subagent.
  process.exit(0);
}
