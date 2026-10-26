#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const marketplace = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));

function manifests(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '.git') return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Plugin source contains a symlink: ${absolute}`);
    if (entry.isDirectory()) return manifests(absolute);
    return entry.name === 'plugin.json' && path.basename(directory) === '.claude-plugin' ? [absolute] : [];
  });
}

for (const entry of marketplace.plugins) {
  const source = path.resolve(ROOT, entry.source);
  const found = manifests(source);
  assert.deepEqual(found, [path.join(source, '.claude-plugin/plugin.json')], `${entry.name}: plugin source must contain exactly its own root manifest`);
  const manifest = JSON.parse(fs.readFileSync(found[0], 'utf8'));
  assert.equal(manifest.name, entry.name);
  assert.equal(manifest.version, entry.version);
  assert.equal(Object.hasOwn(manifest, 'types'), false, `${entry.name}: unsupported top-level types field`);
  const skillCount = () => fs.readdirSync(path.join(source, 'skills')).filter(name => fs.existsSync(path.join(source, 'skills', name, 'SKILL.md'))).length;
  if (entry.name === 'my-claude-skills') assert.equal(skillCount(), 46);
  if (entry.name === 'my-roblox-skills') {
    assert.equal(skillCount(), 30);
    assert.equal(fs.existsSync(path.join(source, 'licenses/roblox-brain-LICENSE')), true, 'my-roblox-skills must carry the upstream license');
  }
}
console.log('✔ every marketplace source has one correctly placed manifest and matching metadata');
