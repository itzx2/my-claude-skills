#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const START = '<!-- vendor-catalog:start -->';
const END = '<!-- vendor-catalog:end -->';

function render() {
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'vendor/record.json'), 'utf8'));
  const groups = [];
  for (const upstream of Object.values(record.upstreams)) {
    const entries = Object.entries(upstream.skills).filter(([, entry]) => ['verbatim', 'patched', 'forked'].includes(entry.status));
    if (!entries.length) continue;
    const repository = upstream.repo.replace(/\.git$/, '');
    const rows = entries.sort(([a], [b]) => a.localeCompare(b)).map(([name, entry]) => {
      const local = entry.dest || `skills/${name}`;
      const isPlugin = upstream.discover === '.claude-plugin/plugin.json';
      const source = isPlugin ? `${repository}/tree/${upstream.pin}/${entry.path}` : `${repository}/blob/${upstream.pin}/${entry.path}/SKILL.md`;
      return `| [${name}](${local}) | ${entry.status} | [${isPlugin ? 'plugin folder' : 'SKILL.md'}](${source}) |`;
    });
    groups.push(`#### [${repository.split('/').slice(-2).join('/')}](${repository}) — ${entries.length} entries\n\nPin: [\`${upstream.pin.slice(0, 7)}\`](${repository}/commit/${upstream.pin}). Links point to the pinned source, including the original source of locally maintained forks.\n\n| Skill or plugin | Local status | Skill source |\n| --- | --- | --- |\n${rows.join('\n')}`);
  }
  const absorbed = Object.values(record.upstreams).flatMap(upstream =>
    Object.entries(upstream.skills).filter(([, entry]) => entry.status === 'absorbed').map(([name, entry]) =>
      `| ${name} | ${[].concat(entry.into || []).map(file => `[${file}](${file})`).join(', ')} | [upstream source](${upstream.repo.replace(/\.git$/, '')}/tree/${upstream.pin}/${entry.path}) |`));
  if (absorbed.length) groups.push(`#### Absorbed upstream material\n\nThese are not separately installed skills.\n\n| Upstream entry | Local home | Source |\n| --- | --- | --- |\n${absorbed.join('\n')}`);
  return `${START}\n\n${groups.join('\n\n')}\n\n${END}`;
}

try {
  const file = path.join(ROOT, 'README.md');
  const readme = fs.readFileSync(file, 'utf8');
  const begin = readme.indexOf(START), end = readme.indexOf(END);
  if (begin < 0 || end < begin) throw new Error('README is missing vendor catalog markers');
  const current = readme.slice(begin, end + END.length).replaceAll('\r\n', '\n');
  const expected = render();
  if (process.argv[2] === 'generate') {
    fs.writeFileSync(file, readme.slice(0, begin) + expected + readme.slice(end + END.length));
  } else if (process.argv[2] !== 'check') throw new Error('usage: node scripts/vendor-catalog.js <generate|check>');
  else if (current !== expected) throw new Error('README vendor catalog is stale; run node scripts/vendor-catalog.js generate');
  console.log('✔ README vendor catalog matches the record');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
