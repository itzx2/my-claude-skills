#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, 'plugins', 'my-claude-skills');

function walk(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in plugin payload: ${absolute}`);
    return entry.isDirectory() ? walk(absolute, base) : [path.relative(base, absolute)];
  });
}

function expectedFiles() {
  const files = ['.claude-plugin/plugin.json', 'README.md', 'CLAUDE.md', 'GLOSSARY.md'];
  for (const directory of ['skills', 'hooks', 'scripts', 'vendor', 'docs', '.claude/skills']) {
    files.push(...walk(path.join(ROOT, directory)).map(file => path.join(directory, file)));
  }
  return new Map(files.map(file => [file.replaceAll('\\', '/'), fs.readFileSync(path.join(ROOT, file))]));
}

function assertDestination() {
  for (const directory of [path.join(ROOT, 'plugins'), DEST]) {
    if (fs.existsSync(directory) && fs.lstatSync(directory).isSymbolicLink()) {
      throw new Error(`Refusing symlink destination: ${directory}`);
    }
  }
}

function check() {
  assertDestination();
  const expected = expectedFiles();
  const actual = fs.existsSync(DEST) ? walk(DEST).map(file => file.replaceAll('\\', '/')) : [];
  const problems = actual.filter(file => !expected.has(file)).map(file => `Unexpected: ${file}`);
  for (const [file, content] of expected) {
    const target = path.join(DEST, file);
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(content)) problems.push(`Missing or stale: ${file}`);
  }
  if (problems.length) throw new Error(`${problems.slice(0, 8).join('\n')}\nRun node scripts/marketplace-payload.js generate`);
  console.log(`✔ isolated marketplace payload matches ${expected.size} source files`);
}

function generate() {
  assertDestination();
  const expected = expectedFiles();
  if (fs.existsSync(DEST)) {
    for (const file of walk(DEST)) {
      if (!expected.has(file.replaceAll('\\', '/'))) fs.unlinkSync(path.join(DEST, file));
    }
  }
  for (const [file, content] of expected) {
    const target = path.join(DEST, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  check();
}

module.exports = { check, generate };
if (require.main === module) {
  try {
    const command = process.argv[2];
    if (command === 'generate') generate();
    else if (command === 'check') check();
    else throw new Error('usage: node scripts/marketplace-payload.js <generate|check>');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
