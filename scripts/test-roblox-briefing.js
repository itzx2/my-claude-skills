#!/usr/bin/env node
'use strict';

// Fixture tests for plugins/my-roblox-skills/hooks/roblox-briefing.js: which
// folders get the full route, which get the pointer, that subagents get theirs,
// and that the first skill and ownership rules come from ROUTES.md.
//
// The hook reads the plugin it ships in, found from its own location, so a
// fixture plugin is a copy of the real one with its ROUTES.md or skills changed.

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN = path.join(ROOT, 'plugins', 'my-roblox-skills');
const HOOK = path.join(PLUGIN, 'hooks', 'roblox-briefing.js');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'mrs-briefing-test-'));

function brief(input, { hook = HOOK, env = {} } = {}) {
  const run = spawnSync(process.execPath, [hook], {
    input: input === undefined ? '' : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout ? JSON.parse(run.stdout).hookSpecificOutput : null;
}

function project(name, files, { git = true } = {}) {
  const dir = path.join(fixture, name);
  fs.mkdirSync(dir, { recursive: true });
  if (git) fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), '');
  }
  return dir;
}

/** A copy of the real plugin whose ROUTES.md is rewritten by `edit`. */
function pluginCopy(name, edit) {
  const dir = path.join(fixture, name);
  fs.cpSync(PLUGIN, dir, { recursive: true });
  const routes = path.join(dir, 'skills', 'ask-roblox', 'ROUTES.md');
  if (edit) fs.writeFileSync(routes, edit(fs.readFileSync(routes, 'utf8').replace(/\r\n/g, '\n')));
  return path.join(dir, 'hooks', 'roblox-briefing.js');
}

/** The bullet lines of one ROUTES.md section, found without the hook's parser. */
function bullets(text, heading) {
  const from = text.indexOf(`## ${heading}\n`);
  const to = text.indexOf('\n## ', from + 1);
  return text.slice(from, to < 0 ? undefined : to).split('\n').filter((l) => l.startsWith('- '));
}

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ok    ${name}`); };

try {
  const skills = fs.readdirSync(path.join(PLUGIN, 'skills')).filter((n) => n.startsWith('roblox-'));
  const routes = fs.readFileSync(path.join(PLUGIN, 'skills', 'ask-roblox', 'ROUTES.md'), 'utf8').replace(/\r\n/g, '\n');
  const rojo = project('rojo', ['default.project.json', 'src/server/init.server.luau']);
  const luauOnly = project('luau', ['src/shared/Util.luau']);
  const place = project('place', ['Game.rbxlx']);
  const wally = project('wally', ['wally.toml']);
  const web = project('web', ['package.json', 'src/index.ts']);

  test('a Rojo project gets the full briefing with its reason', () => {
    const out = brief({ hook_event_name: 'SessionStart', cwd: rojo });
    assert.equal(out.hookEventName, 'SessionStart');
    assert.match(out.additionalContext, /is a Roblox project \(default\.project\.json\)/);
    assert.match(out.additionalContext, /starts with `my-roblox-skills:roblox-collaboration-mode`/);
  });

  test('ROUTES.md groups every installed domain skill exactly once', () => {
    const domains = routes.slice(routes.indexOf('## Domains'), routes.indexOf('## Owners'));
    for (const n of skills) assert.equal(domains.split(`\`${n}\``).length - 1, 1, `${n} not grouped once`);
    assert.equal((domains.match(/`roblox-[a-z-]+`/g) || []).length, skills.length, 'ROUTES.md groups a skill that is not installed');
  });

  test('the full briefing carries every ownership rule in ROUTES.md', () => {
    const text = brief({ hook_event_name: 'SessionStart', cwd: rojo }).additionalContext;
    const owners = bullets(routes, 'Owners');
    assert.ok(owners.length >= 5);
    for (const line of owners) assert.ok(text.includes(line), `missing: ${line}`);
  });

  test('the Owners section is found even as the last section of ROUTES.md', () => {
    const hook = pluginCopy('owners-last', (t) => {
      const start = t.indexOf('## Owners\n'), end = t.indexOf('\n## ', start + 1);
      const owners = t.slice(start, end + 1);
      const rest = `${t.slice(0, start)}${t.slice(end + 1)}`.replace(/\n---\n[\s\S]*$/, '\n');
      return `${rest}\n${owners}`;
    });
    const text = brief({ hook_event_name: 'SessionStart', cwd: rojo }, { hook }).additionalContext;
    for (const line of bullets(routes, 'Owners')) assert.ok(text.includes(line), `missing: ${line}`);
  });

  test('the first skill comes from the First section of ROUTES.md', () => {
    const hook = pluginCopy('first-moved', (t) => t.replace('`roblox-collaboration-mode` is loaded first', '`roblox-architecture` is loaded first'));
    for (const cwd of [rojo, web]) {
      const text = brief({ hook_event_name: 'SessionStart', cwd }, { hook }).additionalContext;
      assert.match(text, /my-roblox-skills:roblox-architecture`/);
      assert.doesNotMatch(text, /roblox-collaboration-mode/);
    }
  });

  test('the full briefing points at ROUTES.md by an absolute path that exists', () => {
    const text = brief({ hook_event_name: 'SessionStart', cwd: rojo }).additionalContext;
    const pointed = text.match(/read `([^`]+ROUTES\.md)`/)[1];
    assert.ok(path.isAbsolute(pointed) && fs.existsSync(pointed), pointed);
  });

  test('a subdirectory of a Roblox project still counts', () => {
    const out = brief({ hook_event_name: 'SessionStart', cwd: path.join(rojo, 'src', 'server') });
    assert.match(out.additionalContext, /default\.project\.json/);
  });

  test('Luau sources alone are enough', () => {
    assert.match(brief({ hook_event_name: 'SessionStart', cwd: luauOnly }).additionalContext, /\*\.luau sources/);
  });

  test('a saved place is enough', () => {
    assert.match(brief({ hook_event_name: 'SessionStart', cwd: place }).additionalContext, /\*\.rbxlx/);
  });

  test('a package manager manifest is enough', () => {
    assert.match(brief({ hook_event_name: 'SessionStart', cwd: wally }).additionalContext, /wally\.toml/);
  });

  test('without .git, the walk still finds a marker below the home folder', () => {
    const home = project('home-a', []);
    const game = project('home-a/game', ['default.project.json', 'src/x.txt'], { git: false });
    const env = { HOME: home, USERPROFILE: home };
    assert.match(brief({ hook_event_name: 'SessionStart', cwd: path.join(game, 'src') }, { env }).additionalContext, /default\.project\.json/);
  });

  test('a stray place file in the home folder does not mark folders under it', () => {
    const home = project('home-b', ['Stray.rbxl'], { git: false });
    const docs = project('home-b/docs/notes', ['readme.txt'], { git: false });
    const env = { HOME: home, USERPROFILE: home };
    assert.match(brief({ hook_event_name: 'SessionStart', cwd: docs }, { env }).additionalContext, /is not a Roblox project/);
  });

  test('a subagent gets the full briefing addressed to it', () => {
    const out = brief({ hook_event_name: 'SubagentStart', cwd: rojo, agent_type: 'general-purpose' });
    assert.equal(out.hookEventName, 'SubagentStart');
    assert.match(out.additionalContext, /Your brief may name no domain skills/);
  });

  test('the main session gets no subagent line', () => {
    assert.doesNotMatch(brief({ hook_event_name: 'SessionStart', cwd: rojo }).additionalContext, /Your brief/);
  });

  test('a non-Roblox folder gets a two-line pointer, for subagents too', () => {
    for (const event of ['SessionStart', 'SubagentStart']) {
      const out = brief({ hook_event_name: event, cwd: web });
      assert.equal(out.hookEventName, event);
      assert.equal(out.additionalContext.split('\n').length, 2);
      assert.match(out.additionalContext, /is not a Roblox project/);
      assert.match(out.additionalContext, /start with `my-roblox-skills:roblox-collaboration-mode`/);
    }
  });

  test('the router is named as user-invoked in both forms', () => {
    for (const cwd of [rojo, web]) {
      assert.match(brief({ hook_event_name: 'SessionStart', cwd }).additionalContext, /\/my-roblox-skills:ask-roblox`.*(user-invoked|only the user can start it)/s);
    }
  });

  // Hook context over 10,000 characters is cut to a 2,000-character preview; the
  // briefing also rides into every subagent, so it is held far below that.
  test('the full briefing stays small', () => {
    const text = brief({ hook_event_name: 'SubagentStart', cwd: rojo }).additionalContext;
    assert.ok(text.length < 4000, `briefing is ${text.length} characters`);
  });

  test('no stdin falls back to CLAUDE_PROJECT_DIR', () => {
    const out = brief(undefined, { env: { CLAUDE_PROJECT_DIR: rojo } });
    assert.equal(out.hookEventName, 'SessionStart');
    assert.match(out.additionalContext, /default\.project\.json/);
  });

  test('a plugin with no domain skills briefs nothing and still exits 0', () => {
    const hook = pluginCopy('no-skills');
    for (const n of skills) fs.rmSync(path.join(fixture, 'no-skills', 'skills', n), { recursive: true });
    assert.equal(brief({ hook_event_name: 'SessionStart', cwd: rojo }, { hook }), null);
  });

  test('a missing ROUTES.md still yields a briefing', () => {
    const hook = pluginCopy('no-routes');
    fs.rmSync(path.join(fixture, 'no-routes', 'skills', 'ask-roblox', 'ROUTES.md'));
    const text = brief({ hook_event_name: 'SessionStart', cwd: rojo }, { hook }).additionalContext;
    assert.match(text, /loads the domain skills that own its questions/);
    assert.doesNotMatch(text, /## Owners/);
  });

  test('garbage on stdin never blocks', () => {
    const run = spawnSync(process.execPath, [HOOK], { input: '{not json', encoding: 'utf8' });
    assert.equal(run.status, 0);
  });

  console.log(`✔ roblox briefing: ${passed} tests passed`);
} finally {
  const resolved = path.resolve(fixture);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('mrs-briefing-test-')) {
    throw new Error(`Refusing unexpected fixture cleanup: ${resolved}`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}
