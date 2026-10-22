#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'mcs-payload-test-'));

try {
  for (const directory of ['scripts', 'skills', 'hooks', 'vendor', 'docs', '.claude/skills', '.claude-plugin', 'plugins/savvy-progress/.claude-plugin']) {
    fs.mkdirSync(path.join(fixture, directory), { recursive: true });
  }
  for (const file of ['README.md', 'CLAUDE.md', 'GLOSSARY.md']) fs.writeFileSync(path.join(fixture, file), 'fixture\n');
  fs.writeFileSync(path.join(fixture, '.claude-plugin/plugin.json'), '{"name":"main","version":"1"}\n');
  fs.writeFileSync(path.join(fixture, '.claude-plugin/marketplace.json'), '{"plugins":[]}\n');
  fs.writeFileSync(path.join(fixture, 'plugins/savvy-progress/.claude-plugin/plugin.json'), '{"name":"sibling"}\n');
  const script = path.join(fixture, 'scripts/marketplace-payload.js');
  fs.copyFileSync(path.join(__dirname, 'marketplace-payload.js'), script);
  const run = command => spawnSync(process.execPath, [script, command], { encoding: 'utf8' });
  assert.equal(run('generate').status, 0);
  const destination = path.join(fixture, 'plugins/my-claude-skills');
  assert.equal(fs.existsSync(path.join(destination, '.claude-plugin/plugin.json')), true);
  assert.equal(fs.existsSync(path.join(destination, '.claude-plugin/marketplace.json')), false);
  assert.equal(fs.existsSync(path.join(destination, 'plugins')), false);
  assert.equal(run('check').status, 0);

  fs.writeFileSync(path.join(fixture, 'README.md'), 'changed source\n');
  assert.notEqual(run('check').status, 0, 'stale release content must fail');
  assert.equal(run('generate').status, 0);
  fs.writeFileSync(path.join(destination, 'unexpected.txt'), 'stale payload file\n');
  assert.notEqual(run('check').status, 0, 'extra release content must fail');
  assert.equal(run('generate').status, 0);
  assert.equal(fs.existsSync(path.join(destination, 'unexpected.txt')), false);
  assert.equal(run('check').status, 0);
  console.log('✔ payload excludes sibling/marketplace and detects and repairs stale/extra files');
} finally {
  const resolved = path.resolve(fixture);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('mcs-payload-test-')) {
    throw new Error(`Refusing unexpected fixture cleanup: ${resolved}`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}
