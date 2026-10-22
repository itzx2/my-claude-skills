#!/usr/bin/env node
/**
 * Vendor helper: the mechanical half of a sync. The judgment half (deciding
 * about new and removed upstream skills, re-applying a patch whose upstream
 * text moved) belongs to the agent running `.claude/skills/sync-upstream`.
 *
 *   node scripts/vendor.js report <upstream> [ref]   what changed since the pin
 *   node scripts/vendor.js take <upstream> <skill> [ref]   copy one entry in
 *   node scripts/vendor.js pin <upstream> <ref>      move the pin
 *   node scripts/vendor.js check [upstream...]       verify the record holds
 *
 * Everything reads `vendor/record.json`, the vendor record: each upstream's
 * repo and pin, and each vendored entry's status (verbatim, patched, forked,
 * absorbed, skipped). `check` exits non-zero on any failure, like the other
 * scripts/test-*.sh.
 *
 * Upstreams are cloned once into the OS temp directory and fetched only when
 * the ref asked for is missing, so `check` runs offline once a clone exists.
 *
 * An upstream with `"rewrite": "namespace"` has its skill references rewritten
 * to this plugin's invocations on the way in (`"tdd"` on a Skill-tool line
 * becomes `"my-claude-skills:tdd"`, `/tdd` becomes `/my-claude-skills:tdd`).
 * A bare name is not reliable: the Skill tool resolves some (`karpathy-
 * guidelines`) and answers "Unknown skill" for others (`prototype`, which
 * clashes with a hidden built-in), so every reference is rewritten rather than
 * only the ones known to clash today.
 *
 * A patch may list files it `adds` beside upstream's (a test, say). `take`
 * keeps them when it replaces the folder, and `check` insists they exist.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RECORD_PATH = path.join(ROOT, 'vendor', 'record.json');
const CACHE = path.join(os.tmpdir(), 'my-claude-skills-vendor');
const STATUSES = ['verbatim', 'patched', 'forked', 'absorbed', 'skipped'];
const SHIPPED = new Set(['verbatim', 'patched', 'forked']); // statuses whose folder ships
const TAKEN = new Set(['verbatim', 'patched']); // statuses `take` copies in from upstream

const destOf = (skill, e) => e.dest || `skills/${skill}`;
const addsOf = (e) => (e.patches || []).flatMap((p) => p.adds || []);

const readRecord = () => JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
const writeRecord = (r) =>
  fs.writeFileSync(RECORD_PATH, JSON.stringify(r, null, 2) + '\n');

function upstreamOf(record, name) {
  const u = record.upstreams[name];
  if (!u) throw new Error(`no upstream "${name}" in vendor/record.json`);
  return u;
}

// --- git ------------------------------------------------------------------

const git = (dir, args, opts = {}) =>
  execFileSync('git', ['-C', dir, ...args], { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const gitText = (dir, args) => git(dir, args, { encoding: 'utf8' }).trim();

function hasCommit(dir, ref) {
  try { git(dir, ['cat-file', '-e', `${ref}^{commit}`]); return true; } catch { return false; }
}

// Clone on first use; fetch only when `ref` is not already present.
function clone(name, u, ref) {
  const dir = path.join(CACHE, name);
  if (!fs.existsSync(path.join(dir, '.git'))) {
    fs.mkdirSync(CACHE, { recursive: true });
    execFileSync('git', ['clone', '--quiet', u.repo, dir], { stdio: ['ignore', 'ignore', 'inherit'] });
  } else if (!ref || !hasCommit(dir, ref)) {
    git(dir, ['fetch', '--quiet', '--tags', 'origin']);
  }
  return dir;
}

const resolve = (dir, ref) => gitText(dir, ['rev-parse', `${ref}^{commit}`]);
// A branch name means upstream's branch, not the stale local one the clone made.
const remoteRef = (dir, ref) => (hasCommit(dir, `origin/${ref}`) ? `origin/${ref}` : ref);
const filesAt = (dir, ref, p) =>
  gitText(dir, ['ls-tree', '-r', '--name-only', ref, '--', p]).split('\n').filter(Boolean);
const blobAt = (dir, ref, file) => git(dir, ['show', `${ref}:${file}`]);

// Every entry an upstream offers at `ref`: the directory holding its discover
// file (`SKILL.md` for skills, `.claude-plugin/plugin.json` for plugins).
function offered(dir, ref, discover) {
  const out = new Map();
  for (const f of gitText(dir, ['ls-tree', '-r', '--name-only', ref]).split('\n')) {
    if (!f.endsWith('/' + discover)) continue;
    const entryDir = f.slice(0, -('/' + discover).length);
    out.set(path.posix.basename(entryDir), entryDir);
  }
  return out;
}

// --- the namespace rewrite -------------------------------------------------

function shippedNames() {
  const dir = path.join(ROOT, 'skills');
  return new Set(
    fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'SKILL.md'))),
  );
}

function namespace(text, names, ns) {
  const fm = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  const head = fm ? fm[0] : '';
  const body = text.slice(head.length).split('\n').map((line) => {
    let l = line.replace(
      /(^|[\s`(\[])\/([a-z][a-z0-9-]*)(?=[\s`.,;:)\]!?]|$)/g,
      (all, pre, n) => (names.has(n) ? `${pre}/${ns}:${n}` : all),
    );
    if (/Skill tool/i.test(l)) {
      l = l.replace(/(["`])([a-z][a-z0-9-]*)\1/g, (all, q, n) =>
        names.has(n) ? `${q}${ns}:${n}${q}` : all,
      );
    }
    return l;
  });
  return head + body.join('\n');
}

// What a vendored file should hold locally: the upstream bytes, rewritten when
// the upstream asks for it. Only Markdown is rewritten.
function incoming(u, file, buf, names, ns) {
  if (u.rewrite !== 'namespace' || !file.endsWith('.md')) return buf;
  return Buffer.from(namespace(buf.toString('utf8'), names, ns), 'utf8');
}

// --- local files -------------------------------------------------------------

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}
// Checkouts on Windows may carry CRLF; the comparison is about content.
const norm = (buf) => buf.toString('utf8').replace(/\r\n/g, '\n');

// --- commands ----------------------------------------------------------------

function report(name, refArg) {
  const record = readRecord();
  const u = upstreamOf(record, name);
  const dir = clone(name, u); // no ref asked for, so this fetches
  const ref = resolve(dir, refArg ? remoteRef(dir, refArg) : 'origin/HEAD');
  const pin = resolve(dir, u.pin);
  const count = gitText(dir, ['rev-list', '--count', `${pin}..${ref}`]);
  console.log(`${name}: pin ${pin.slice(0, 7)} -> ${ref.slice(0, 7)} (${count} commits)\n`);

  const now = offered(dir, ref, u.discover || 'SKILL.md');
  const lines = { changed: [], moved: [], removed: [], unchanged: [] };
  for (const [skill, e] of Object.entries(u.skills)) {
    if (!e.path || (e.status === 'skipped' && !now.has(skill))) continue;
    let p = e.path;
    if (!filesAt(dir, ref, p).length) {
      if (now.has(skill)) { lines.moved.push(`  ${skill} [${e.status}]: ${p} -> ${now.get(skill)}`); p = now.get(skill); }
      else { lines.removed.push(`  ${skill} [${e.status}]: gone from upstream`); continue; }
    }
    const log = gitText(dir, ['log', '--format=%h %ad %s', '--date=short', `${pin}..${ref}`, '--', e.path, p]);
    if (log) lines.changed.push(`  ${skill} [${e.status}]\n` + log.split('\n').map((s) => `      ${s}`).join('\n'));
    else lines.unchanged.push(skill);
  }
  const fresh = [...now].filter(([s]) => !u.skills[s]).map(([s, p]) => `  ${s}: ${p}`);

  const section = (title, list) => list.length && console.log(`${title}\n${list.join('\n')}\n`);
  section('New upstream (not in the record, needs a decision):', fresh);
  section('Removed upstream:', lines.removed);
  section('Moved upstream (update the path):', lines.moved);
  section('Changed since the pin:', lines.changed);
  if (lines.unchanged.length) console.log(`Unchanged: ${lines.unchanged.join(', ')}`);
}

function take(name, skill, refArg) {
  const record = readRecord();
  const u = upstreamOf(record, name);
  const e = u.skills[skill];
  if (!e) throw new Error(`"${skill}" is not in the record for ${name}; add it first`);
  if (!TAKEN.has(e.status)) {
    throw new Error(`"${skill}" is ${e.status}; only verbatim and patched entries are taken`);
  }
  const dir = clone(name, u, refArg || u.pin);
  const ref = resolve(dir, refArg ? remoteRef(dir, refArg) : u.pin);
  const files = filesAt(dir, ref, e.path);
  if (!files.length) throw new Error(`${e.path} does not exist at ${ref.slice(0, 7)}`);
  const dest = path.join(ROOT, destOf(skill, e));
  // Files a patch adds beside upstream's survive the replacement.
  const kept = addsOf(e)
    .filter((f) => fs.existsSync(path.join(dest, f)))
    .map((f) => [f, fs.readFileSync(path.join(dest, f))]);
  fs.rmSync(dest, { recursive: true, force: true });
  const names = shippedNames().add(skill);
  for (const f of files) {
    const out = path.join(dest, path.posix.relative(e.path, f));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, incoming(u, f, blobAt(dir, ref, f), names, record.namespace));
  }
  for (const [f, buf] of kept) {
    fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true });
    fs.writeFileSync(path.join(dest, f), buf);
  }
  console.log(`took ${skill} from ${name}@${ref.slice(0, 7)} (${files.length} files` +
    (kept.length ? `, kept ${kept.length} added by patches` : '') + ')' +
    (e.status === 'patched' ? '; re-apply its patches, then run check' : ''));
}

function pin(name, refArg) {
  const record = readRecord();
  const u = upstreamOf(record, name);
  const dir = clone(name, u); // always fetch: a pin should name upstream as it is now
  u.pin = resolve(dir, remoteRef(dir, refArg));
  writeRecord(record);
  console.log(`${name} pinned at ${u.pin}`);
}

function check(only) {
  const record = readRecord();
  const names = shippedNames();
  const fails = [];
  const fail = (m) => fails.push(m);
  const claimed = new Set(record.own || []);
  // Destinations a shipped entry of any upstream owns. A skipped entry of one
  // upstream may share its name with a shipped one of another (emil's
  // prototype beside Matt's), and that is no leftover.
  const shippedDest = new Set(record.own?.map((n) => `skills/${n}`));
  for (const u of Object.values(record.upstreams)) {
    for (const [s, e] of Object.entries(u.skills)) {
      if (SHIPPED.has(e.status)) shippedDest.add(destOf(s, e));
    }
  }

  for (const [name, u] of Object.entries(record.upstreams)) {
    if (only.length && !only.includes(name)) continue;
    let dir = null;
    const at = () => (dir ??= clone(name, u, u.pin));
    for (const [skill, e] of Object.entries(u.skills)) {
      const rel = destOf(skill, e);
      const dest = path.join(ROOT, rel);
      const present = fs.existsSync(dest);
      if (!STATUSES.includes(e.status)) { fail(`${skill}: unknown status "${e.status}"`); continue; }
      if (SHIPPED.has(e.status)) {
        if (rel.startsWith('skills/')) claimed.add(skill);
        if (!present) { fail(`${skill}: ${e.status} but ${rel} is missing`); continue; }
      } else if (present && !shippedDest.has(rel)) {
        fail(`${skill}: ${e.status} but ${rel} still exists`);
      }
      if (e.status === 'verbatim') {
        const files = filesAt(at(), u.pin, e.path);
        if (!files.length) { fail(`${skill}: ${e.path} missing upstream at the pin`); continue; }
        const local = new Set(walk(dest));
        for (const f of files) {
          const r = path.posix.relative(e.path, f);
          local.delete(r);
          const mine = path.join(dest, r);
          const want = incoming(u, f, blobAt(at(), u.pin, f), names, record.namespace);
          if (!fs.existsSync(mine)) fail(`${skill}: ${r} missing`);
          else if (norm(fs.readFileSync(mine)) !== norm(want)) fail(`${skill}: ${r} differs from upstream at the pin`);
        }
        for (const extra of local) fail(`${skill}: ${extra} is not upstream`);
      }
      if (e.status === 'patched' && u.rewrite === 'namespace') {
        for (const f of walk(dest).filter((f) => f.endsWith('.md'))) {
          const t = norm(fs.readFileSync(path.join(dest, f)));
          if (namespace(t, names, record.namespace) !== t) fail(`${skill}: ${f} has a bare skill reference`);
        }
      }
      for (const patch of e.patches || []) {
        for (const c of patch.checks || []) {
          const where = c.file || 'SKILL.md';
          const file = path.join(dest, where);
          const t = fs.existsSync(file) ? norm(fs.readFileSync(file)) : '';
          if (c.contains && !t.includes(c.contains)) fail(`${skill}: patch "${patch.purpose}" not found (${where} lacks "${c.contains}")`);
          if (c.absent && t.includes(c.absent)) fail(`${skill}: patch "${patch.purpose}" undone (${where} has "${c.absent}")`);
        }
        for (const f of patch.adds || []) {
          if (!fs.existsSync(path.join(dest, f))) fail(`${skill}: patch adds ${f}, which is missing`);
        }
      }
      if (e.status === 'absorbed') {
        for (const into of [].concat(e.into || [])) {
          if (!fs.existsSync(path.join(ROOT, into))) fail(`${skill}: absorbed into ${into}, which is missing`);
        }
      }
    }
  }

  if (!only.length) {
    for (const n of names) if (!claimed.has(n)) fail(`skills/${n}: in no upstream and not listed as own`);
    for (const n of record.own || []) if (!names.has(n)) fail(`own skill ${n} is missing`);
    const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
    for (const n of names) if (!new RegExp(`\\*\\*/?${n}\\*\\*`).test(readme)) fail(`README does not list ${n}`);
    // Every plugin this marketplace lists carries the same version in both
    // places: the cache is keyed on it, so drift serves stale files silently.
    const market = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
    for (const entry of market.plugins) {
      const manifest = path.join(ROOT, entry.source, '.claude-plugin/plugin.json');
      const version = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')).version : undefined;
      if (entry.version !== version) fail(`marketplace.json lists ${entry.name} at ${entry.version}, its plugin.json says ${version}`);
    }
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'scripts/vendor-catalog.js'), 'check'], { stdio: 'pipe' });
      require('./marketplace-payload').check();
      execFileSync(process.execPath, [path.join(ROOT, 'scripts/test-marketplace-layout.js')], { stdio: 'pipe' });
    } catch (error) {
      fail(error.stderr?.toString().trim() || error.message);
    }
  }

  if (fails.length) {
    for (const f of fails) console.log(`✘ ${f}`);
    console.log(`\n${fails.length} problem(s)`);
    process.exit(1);
  }
  console.log('✔ vendor record holds');
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === 'report' && args[0]) report(args[0], args[1]);
  else if (cmd === 'take' && args[1]) take(args[0], args[1], args[2]);
  else if (cmd === 'pin' && args[1]) pin(args[0], args[1]);
  else if (cmd === 'check') check(args);
  else {
    console.error('usage: vendor.js report <upstream> [ref] | take <upstream> <skill> [ref] | pin <upstream> <ref> | check [upstream...]');
    process.exit(2);
  }
} catch (err) {
  console.error(`vendor.js: ${err.message}`);
  process.exit(2);
}
