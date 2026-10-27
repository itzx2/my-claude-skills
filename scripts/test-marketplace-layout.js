#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const marketplace = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
// The Roblox plugin's hand-maintained skills, written in this repository.
const ROBLOX_OWN_SKILLS = ['ask-roblox', 'setup-roblox-standards'];
// setup-roblox-standards' section templates and the domain skills each derives from (issue #24).
const STANDARDS_SECTIONS = {
  architecture: ['roblox-architecture', 'roblox-luau-patterns'],
  'trust-boundary': ['roblox-networking', 'roblox-security'],
  'player-data': ['roblox-data', 'roblox-server-data'],
  'luau-style': ['roblox-luau-core', 'roblox-luau-types'],
};

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
  // Derived, not hard-coded: the payload holds every root skill, and the Roblox
  // plugin its own hand-maintained skills plus every roblox-brain skill the
  // vendor record ships there.
  if (entry.name === 'my-claude-skills') {
    assert.equal(skillCount(), fs.readdirSync(path.join(ROOT, 'skills')).filter(name => fs.existsSync(path.join(ROOT, 'skills', name, 'SKILL.md'))).length);
  }
  if (entry.name === 'my-roblox-skills') {
    const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'vendor/record.json'), 'utf8'));
    const shipped = Object.values(record.upstreams['roblox-brain'].skills)
      .filter(e => ['verbatim', 'patched', 'forked'].includes(e.status))
      .map(e => path.basename(e.dest));
    const skills = fs.readdirSync(path.join(source, 'skills')).filter(name => fs.existsSync(path.join(source, 'skills', name, 'SKILL.md')));
    assert.deepEqual(skills.sort(), [...ROBLOX_OWN_SKILLS, ...shipped].sort(), 'my-roblox-skills ships its own skills plus the vendored ones, nothing else');
    // Each standards section template carries the marker contract and the credit
    // for the domain skills it is derived from.
    for (const [section, sources] of Object.entries(STANDARDS_SECTIONS)) {
      const template = path.join(source, 'skills', 'setup-roblox-standards', 'templates', `${section}.md`);
      assert.equal(fs.existsSync(template), true, `missing template: ${section}`);
      const text = fs.readFileSync(template, 'utf8');
      const start = `<!-- my-roblox-skills:${section}:start -->`, end = `<!-- my-roblox-skills:${section}:end -->`;
      assert.equal(text.split(start).length - 1, 1, `${section}: one start marker`);
      assert.equal(text.split(end).length - 1, 1, `${section}: one end marker`);
      assert.ok(text.indexOf(start) < text.indexOf(end), `${section}: start marker before end marker`);
      const inside = text.slice(text.indexOf(start), text.indexOf(end));
      const credit = inside.split('\n').find(line => line.includes('TabooHarmony/roblox-brain') && line.includes('(MIT)'));
      assert.ok(credit, `${section}: attribution line inside the markers`);
      for (const skill of sources) assert.ok(credit.includes(`\`${skill}\``), `${section}: attribution names ${skill}`);
    }
    assert.equal(fs.existsSync(path.join(source, 'licenses/roblox-brain-LICENSE')), true, 'my-roblox-skills must carry the upstream license');
  }
}
console.log('✔ every marketplace source has one correctly placed manifest and matching metadata');
