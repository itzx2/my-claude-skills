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
 * repository open, and a full briefing in every unrelated session is waste.
 *
 * Names come from the skills on disk, not a list in this file, so a skill added
 * or dropped by a sync cannot leave the briefing lying.
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

/** Domain groups, in the order the router presents them. */
const GROUPS = [
  ['Core', ['roblox-collaboration-mode', 'roblox-luau-core', 'roblox-luau-types', 'roblox-luau-patterns',
    'roblox-architecture', 'roblox-networking', 'roblox-security', 'roblox-data', 'roblox-server-data',
    'roblox-performance']],
  ['Gameplay', ['roblox-building', 'roblox-physics', 'roblox-npc-ai', 'roblox-camera', 'roblox-input',
    'roblox-gui', 'roblox-animation-vfx', 'roblox-lighting', 'roblox-audio', 'roblox-localization']],
  ['Design', ['roblox-game-design', 'roblox-player-psychology', 'roblox-growth-design', 'roblox-analytics',
    'roblox-monetization']],
  ['Tools', ['roblox-studio-mcp', 'roblox-tooling', 'roblox-cloud', 'roblox-publish-checklist']],
];

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

function full(skills, reasons, subagent) {
  const known = new Set(skills);
  const grouped = new Set();
  const lines = [
    '# Roblox skills',
    '',
    `This folder looks like a Roblox project (${reasons.join(', ')}). The \`${PLUGIN}\` plugin ` +
      `is installed with ${skills.length} Roblox domain skills, all in your Skill listing.`,
    '',
  ];

  if (subagent) {
    lines.push(
      'You are a subagent. Do the task you were given, and load the domains it touches before ' +
        'writing or judging Roblox code: your brief may not name them.',
      ''
    );
  }

  lines.push(
    '**For any Roblox task, invoke ' + q('roblox-collaboration-mode') + ' first**, then the ' +
      'domain skills the task touches. The first calibrates initiative and evidence; the ' +
      'domains supply the engine knowledge. Pick the relevant ones; do not load all of them.',
    '',
    '## Domains',
    ''
  );

  for (const [title, names] of GROUPS) {
    const present = names.filter((n) => known.has(n));
    present.forEach((n) => grouped.add(n));
    if (present.length) lines.push(`- **${title}:** ${present.map(q).join(', ')}`);
  }
  const other = skills.filter((n) => !grouped.has(n));
  if (other.length) lines.push(`- **Other:** ${other.map(q).join(', ')}`);

  lines.push(
    '',
    '## Who owns what',
    '',
    '- Architecture decides where code lives; luau-patterns shapes the module once it is owned.',
    '- Networking designs a remote; security attacks it. Anything the client sends needs both.',
    '- Data owns durable player saves; server-data owns shared and cross-server state.',
    '- GUI owns presentation and state; input owns actions and device paths.',
    '- Performance starts from a measured scenario, not from the symptom.',
    '- Studio MCP is live editor and runtime work; tooling is the repository and build; cloud is outside the game.',
    '- Web animation skills do not supply Roblox APIs; use the Roblox presentation skills.',
    '',
    '## Common combinations',
    '',
    '- Saves fail or duplicate: architecture → data → security (+ server-data when shared).',
    '- Purchases break: gui + input, monetization + data, networking + security.',
    '- NPCs stuck or laggy: npc-ai + physics, performance to measure.',
    '- Before a release: publish-checklist plus every domain changed.',
    '',
    `The user can run \`/${PLUGIN}:ask-roblox\` for a full routing answer. It is user-invoked, ` +
      'so it is not in your Skill listing: suggest it, never start it.'
  );
  return lines.join('\n');
}

function pointer(skills) {
  return [
    '# Roblox skills',
    '',
    `The \`${PLUGIN}\` plugin is installed (${skills.length} Roblox domain skills, ` +
      `\`${PLUGIN}:roblox-*\`), but this folder does not look like a Roblox project. ` +
      'If the task is Roblox work anyway, such as Studio through MCP with no repository open, ' +
      `invoke ${q('roblox-collaboration-mode')} first, then the domains it touches. ` +
      `The user can run \`/${PLUGIN}:ask-roblox\` for routing; it is user-invoked, so suggest it, never start it.`,
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
