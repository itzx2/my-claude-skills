#!/usr/bin/env node
/**
 * SessionStart and SubagentStart hook: brief every agent on the Roblox skills.
 *
 * The 29 domain skills are model-invocable, so their descriptions already sit
 * in each agent's Skill listing. What a listing cannot carry is the route:
 * load `roblox-collaboration-mode` first, which domain owns a question, and
 * that `/my-roblox-skills:ask-roblox` exists at all (it is user-invoked, so it
 * is hidden from the listing). A subagent never sees the main session's
 * SessionStart context, so the same briefing is injected at SubagentStart too.
 *
 * How much is said depends on the folder. In something that looks like a
 * Roblox project the agent gets the full route; anywhere else it gets a short
 * pointer, because Roblox work also happens through a Studio MCP bridge with no
 * repository open.
 *
 * The full route inlines only what every Roblox task needs: start with
 * collaboration-mode, and the ownership rules. Groups and combinations serve
 * only multi-domain tasks, so they stay in the router's ROUTES.md behind a
 * pointer. The count comes from the skills on disk and the ownership rules from
 * ROUTES.md itself, so the briefing restates nothing it could drift from.
 *
 * Failure must never block a session or a subagent: on any error this exits 0
 * with no output.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PLUGIN = 'my-roblox-skills';
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');

/**
 * Files whose presence marks a Roblox project. Rojo project files, the Roblox
 * package managers and toolchain managers, and saved places or models.
 */
const MARKER_FILES = [
  'default.project.json',
  'wally.toml',
  'pesde.toml',
  'rokit.toml',
  'aftman.toml',
  'foreman.toml',
];
const MARKER_EXTENSIONS = ['.rbxl', '.rbxlx', '.rbxm', '.rbxmx'];
const LUAU_EXTENSIONS = ['.luau'];

/** Read all of stdin, or '' when there is none (a hand run from a terminal). */
function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function list(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** The plugin's model-invocable domain skills, by folder name. */
function domainSkills() {
  return list(path.join(PLUGIN_ROOT, 'skills'))
    .filter((e) => e.isDirectory() && e.name.startsWith('roblox-'))
    .filter((e) => fs.existsSync(path.join(PLUGIN_ROOT, 'skills', e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort();
}

/**
 * Why `start` looks like a Roblox project, or [] when it does not.
 *
 * Walks up from `start` to the repository root (the first directory holding
 * `.git`) or the filesystem root, so a session opened in `src/server` still
 * counts. Each level is checked for marker files, `*.project.json`, and saved
 * places. Luau sources are searched only below `start`, two levels deep and
 * capped, so a huge non-Roblox tree costs a bounded number of reads.
 */
function detect(start) {
  const reasons = new Set();
  let dir = path.resolve(start);

  for (let level = 0; level < 8; level++) {
    for (const entry of list(dir)) {
      if (!entry.isFile()) continue;
      const name = entry.name.toLowerCase();
      if (MARKER_FILES.includes(name)) reasons.add(entry.name);
      else if (name.endsWith('.project.json')) reasons.add(entry.name);
      else if (MARKER_EXTENSIONS.includes(path.extname(name))) reasons.add(`*${path.extname(name)}`);
    }
    if (fs.existsSync(path.join(dir, '.git'))) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  if (!reasons.size && hasLuau(path.resolve(start), 0, { seen: 0 })) reasons.add('*.luau sources');
  return [...reasons].sort();
}

const SKIP = new Set(['.git', 'node_modules', 'Packages', 'DevPackages', 'ServerPackages']);

function hasLuau(dir, depth, budget) {
  if (depth > 2) return false;
  for (const entry of list(dir)) {
    if (++budget.seen > 400) return false;
    if (entry.isFile() && LUAU_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) return true;
    if (entry.isDirectory() && !SKIP.has(entry.name) && hasLuau(path.join(dir, entry.name), depth + 1, budget)) {
      return true;
    }
  }
  return false;
}

const q = (name) => `\`${PLUGIN}:${name}\``;
const ROUTER = `\`/${PLUGIN}:ask-roblox\``;
const ROUTES = path.join(PLUGIN_ROOT, 'skills', 'ask-roblox', 'ROUTES.md');

/**
 * The Owners section of the router's ROUTES.md, the single source for which
 * domain owns a question two domains touch. Inlined rather than restated, so
 * the briefing and the router cannot drift apart. '' when it cannot be read.
 */
function owners() {
  let text;
  try {
    text = fs.readFileSync(ROUTES, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return '';
  }
  const match = text.match(/^## Owners\n([\s\S]*?)(?=^## )/m);
  return match ? match[1].trim() : '';
}

function full(skills, reasons, subagent) {
  const lines = [
    '# Roblox skills',
    '',
    `This folder is a Roblox project (${reasons.join(', ')}), and \`${PLUGIN}\` holds ` +
      `${skills.length} Roblox domain skills, all in your Skill listing.`,
    '',
    `**Every Roblox task starts with ${q('roblox-collaboration-mode')}**, then the domain ` +
      'skills that own its questions, loaded before writing or judging Roblox code.',
  ];

  if (subagent) lines.push('', 'Your brief may name no domain skills; choose them from your task.');

  const owned = owners();
  if (owned) lines.push('', '## Owners', '', 'When two domains touch one question, the owner decides:', '', owned);

  lines.push(
    '',
    `**When a task spans several domains**, read \`${ROUTES.replace(/\\/g, '/')}\` for the ` +
      'domain groups and the combinations common problems need.',
    '',
    `${ROUTER} is the user's router over these skills. It is user-invoked, so it is absent ` +
      'from your Skill listing: suggest it to the user when the route is unclear.'
  );
  return lines.join('\n');
}

function pointer(skills) {
  return [
    '# Roblox skills',
    '',
    `\`${PLUGIN}\` holds ${skills.length} Roblox domain skills (\`${PLUGIN}:roblox-*\`). This ` +
      'folder is not a Roblox project; when the task is Roblox work anyway, such as Studio ' +
      `through MCP, start with ${q('roblox-collaboration-mode')}, then the domains the task ` +
      `touches. The user can run ${ROUTER} for routing: suggest it, since only the user can start it.`,
  ].join('\n');
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

  const reasons = detect(cwd);
  const context = reasons.length ? full(skills, reasons, event === 'SubagentStart') : pointer(skills);

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
