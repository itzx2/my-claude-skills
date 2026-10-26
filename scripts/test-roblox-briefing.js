#!/usr/bin/env node
'use strict';

// Fixture tests for plugins/my-roblox-skills/hooks/roblox-briefing.js: which
// folders get the full route, which get the pointer, that subagents get theirs,
// and that every installed domain skill is named.

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN = path.join(ROOT, 'plugins', 'my-roblox-skills');
const HOOK = path.join(PLUGIN, 'hooks', 'roblox-briefing.js');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'mrs-briefing-test-'));

function brief(input, env = {}) {
  const run = spawnSync(process.execPath, [HOOK], {
    input: input === undefined ? '' : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN, ...env },
  });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout ? JSON.parse(run.stdout).hookSpecificOutput : null;
}

function project(name, files) {
  const dir = path.join(fixture, name);
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), '');
  }
  return dir;
}

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ok    ${name}`); };

try {
  const skills = fs.readdirSync(path.join(PLUGIN, 'skills')).filter((n) => n.startsWith('roblox-'));
  const rojo = project('rojo', ['default.project.json', 'src/server/init.server.luau']);
  const luauOnly = project('luau', ['src/shared/Util.luau']);
  const place = project('place', ['Game.rbxlx']);
  const web = project('web', ['package.json', 'src/index.ts']);

  test('a Rojo project gets the full briefing with its reason', () => {
    const out = brief({ hook_event_name: 'SessionStart', cwd: rojo });
    assert.equal(out.hookEventName, 'SessionStart');
    assert.match(out.additionalContext, /is a Roblox project \(default\.project\.json\)/);
    assert.match(out.additionalContext, /starts with `my-roblox-skills:roblox-collaboration-mode`/);
  });

  const routes = fs.readFileSync(path.join(PLUGIN, 'skills', 'ask-roblox', 'ROUTES.md'), 'utf8').replace(/\r\n/g, '\n');

  test('ROUTES.md groups every installed domain skill exactly once', () => {
    const domains = routes.slice(routes.indexOf('## Domains'), routes.indexOf('## Owners'));
    for (const n of skills) assert.equal(domains.split(`\`${n}\``).length - 1, 1, `${n} not grouped once`);
    assert.equal((domains.match(/`roblox-[a-z-]+`/g) || []).length, skills.length, 'ROUTES.md groups a skill that is not installed');
  });

  test('the full briefing inlines the Owners section of ROUTES.md verbatim', () => {
    const owners = routes.match(/^## Owners\n([\s\S]*?)(?=^## )/m)[1].trim();
    assert.ok(owners.length > 100);
    assert.ok(brief({ hook_event_name: 'SessionStart', cwd: rojo }).additionalContext.includes(owners));
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

  test('a subagent gets the full briefing addressed to it', () => {
    const out = brief({ hook_event_name: 'SubagentStart', cwd: rojo, agent_type: 'general-purpose' });
    assert.equal(out.hookEventName, 'SubagentStart');
    assert.match(out.additionalContext, /Your brief may name no domain skills/);
  });

  test('the main session gets no subagent line', () => {
    assert.doesNotMatch(brief({ hook_event_name: 'SessionStart', cwd: rojo }).additionalContext, /Your brief/);
  });

  test('a non-Roblox folder gets only the pointer, for subagents too', () => {
    for (const event of ['SessionStart', 'SubagentStart']) {
      const out = brief({ hook_event_name: event, cwd: web });
      assert.equal(out.hookEventName, event);
      assert.match(out.additionalContext, /is not a Roblox project/);
      assert.doesNotMatch(out.additionalContext, /## Owners/);
      assert.ok(out.additionalContext.length < 800, 'pointer should stay short');
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
    const out = brief(undefined, { CLAUDE_PROJECT_DIR: rojo });
    assert.equal(out.hookEventName, 'SessionStart');
    assert.match(out.additionalContext, /default\.project\.json/);
  });

  test('a plugin root with no skills briefs nothing and still exits 0', () => {
    const empty = path.join(fixture, 'empty-plugin');
    fs.mkdirSync(empty);
    assert.equal(brief({ hook_event_name: 'SessionStart', cwd: rojo }, { CLAUDE_PLUGIN_ROOT: empty }), null);
  });

  test('garbage on stdin never blocks', () => {
    const run = spawnSync(process.execPath, [HOOK], { input: '{not json', encoding: 'utf8', env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN } });
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
