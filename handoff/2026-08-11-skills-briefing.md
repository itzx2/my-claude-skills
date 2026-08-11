# Handoff — session-start skills briefing, upstream sync, installer fix

**Date:** 2026-08-11 · **`main`:** `d0076ac` · **Repo:** `itzx2/my-claude-skills`

Everything here is on `main` and pushed. Read this if you are a fresh session
picking this up or verifying it. Supersedes any earlier copy of this file —
that one predates the installer fix and the `ask-matt` rewrite.

---

## What this repo now does

Skills live in `skills/`. A `SessionStart` hook installs them into
`~/.claude/skills` and injects a **briefing** naming all of them, so an agent
starts every session knowing the full roster.

The briefing exists because Claude Code hides any skill with
`disable-model-invocation: true` from the agent **entirely** — it cannot see,
call, or suggest what it does not know exists. That is **17 of the 30** skills
here. The briefing splits them:

- **Model-invokable (13)** — already in the agent's Skill listing. The roster is
  a recall aid; descriptions are trimmed to a first sentence because the full
  text is already in the listing.
- **User-invoked (17)** — full descriptions, because the briefing is the *only*
  surface they ever appear on. Trimming these would destroy the sole trigger
  information available.

`reloadSkills: true` makes the session re-scan, so it sees what the same hook
installed seconds earlier.

### The four scripts

| File | Role |
| --- | --- |
| `scripts/bootstrap-env.sh` | The only thing a human pastes. Registers the hook in `~/.claude/settings.json`, installs. Once per environment. |
| `scripts/session-start.sh` | The hook. Installs (remote only), then briefs. |
| `scripts/install-skills.sh` | Mirrors `skills/` → `~/.claude/skills`, caches the three scripts into `~/.claude/`. |
| `scripts/skills-briefing.py` | Reads front matter, emits the `additionalContext` payload. |

```
setup script (pasted once per environment)
  └─ bootstrap-env.sh ── hook → ~/.claude/settings.json
                      └─ install-skills.sh ── skills + scripts → ~/.claude/
every session after
  └─ ~/.claude/session-start.sh ── refresh skills (best-effort)
                                └─ skills-briefing.py → briefing
```

---

## Three decisions that look like over-engineering and are not

Please do not "simplify" these away — each fixes a bug that actually occurred.

1. **The installer replaces only skills it owns, tracked in
   `~/.claude/.my-claude-skills.manifest`.** It used to `rm -rf` the whole of
   `~/.claude/skills`. Claude Code syncs the account's own skills into
   `~/.claude/skills/synced/` — **`xlsx`, `docx`, `pdf`, `pptx`,
   `skill-creator`, `morning` all live there** — so that wipe removed them every
   session start. Deletion is still needed so upstream removals propagate, hence
   the manifest bounding what may be removed.

2. **The hook runs a local path, not `curl … | bash`.** Fetching it per session
   made the briefing hostage to the network: with GitHub unreachable a session
   got no briefing at all despite skills sitting on disk. `install-skills.sh`
   refreshes the cached copies on each successful install.

3. **Cached scripts install via `mv`, not `cp`.** `install-skills.sh` can
   overwrite `session-start.sh` while that file is the running script, and bash
   reads scripts incrementally by byte offset. In-place `cp` makes bash resume
   into garbage; `mv` is an atomic rename, so the running shell keeps the old
   inode.

---

## Test results

### Passing — verified in this session

| # | Test | Result |
| --- | --- | --- |
| 1 | Front matter across all 30 skills (`name` matches directory, description present, under 1024 chars, no duplicates) | no issues |
| 2 | Briefing generation | 13 + 17 = 30, valid JSON, `reloadSkills: true`, ~1315 tokens |
| 3 | Live deploy from `main` into a clean `HOME` | hook registered, 30 installed, briefing emitted |
| 4 | **`synced/` preserved** (sandbox, live deploy, first-install, re-run) | `synced/xlsx` INTACT in all four |
| 5 | Upstream removal still propagates | stale `writing-great-skills` removed via manifest |
| 6 | Total outage (no HTTP origin, dead git remote) | full briefing from cache, **30 skills still intact** |
| 7 | Bootstrap idempotency | re-run adds no duplicate hook entry |
| 8 | Bootstrap with foreign settings | `env`, `Stop`, and the image's git-identity `SessionStart` hook all preserved |
| 9 | Bootstrap with corrupt `settings.json` | refuses to write, exits 0 |
| 10 | New skill added upstream | appears in the **same** session (install runs before briefing) |
| 11 | Skill reclassified / removed upstream | moves bucket / disappears correctly |
| 12 | Briefing edge cases (empty dir, missing dir, no front matter, quoted values, block scalars) | all handled, silent when nothing to say |
| 13 | Hook fires in a real session | confirmed — this session's context carried the briefing |

### Not yet verified — do these first

1. **The fixed installer in a real fresh session.** Only sandbox and live-curl
   deploy have been tested. Any session started before `d0076ac` still has the
   old cached installer.
2. **The rewritten `ask-matt` in a session with `synced/` intact.** The one real
   run hit both bugs at once — it executed the *stale* pre-rewrite copy, and
   `synced/` had already been deleted. See below.
3. **Whether agents actually recommend user-invoked skills at fitting moments.**
   This is prompt behaviour, argued about rather than measured. `skill-creator`
   can run evals on triggering accuracy if it matters.

### The one real-session failure, and what it proved

A fresh session ran `/ask-matt` with "I need to make a spreadsheet". It replied
that no skill covers it. **That answer was correct** — `ls ~/.claude/skills` in
that session showed no `synced/` directory, so `xlsx` genuinely was not
installed. `dataviz` was still offered because it is not on disk and so was
never deleted; that asymmetry is what identified the cause.

Two separate faults, both now fixed on `main`: the installer wiped `synced/`
(fix 1 above), and the session was running the pre-rewrite `ask-matt` because
`~/.claude/skills` was installed before that commit landed.

---

## Verification checklist

Run from a clone of `main`. Use a temp `HOME` for anything that installs — with
your real `HOME` these rewrite `~/.claude/skills`.

**1. Front matter**

```sh
python3 - <<'PY'
import os, importlib.util
spec=importlib.util.spec_from_file_location('b','scripts/skills-briefing.py')
b=importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
bad=[]
for s in sorted(os.listdir('skills')):
    f=b.parse_front_matter(os.path.join('skills',s,'SKILL.md'))
    if not f.get('name'): bad.append(f"{s}: no name")
    elif f['name']!=s: bad.append(f"{s}: name '{f['name']}' != directory")
    if not f.get('description'): bad.append(f"{s}: no description")
print(len(os.listdir('skills')), "skills;", bad or "no issues")
PY
```
Expect `30 skills; no issues`

**2. Briefing**

```sh
CLAUDE_SKILLS_DIR=./skills python3 scripts/skills-briefing.py \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["hookSpecificOutput"]["additionalContext"])'
```
Expect 13 plain entries, 17 `/`-prefixed.

**3. `synced/` survives — the regression that matters most**

```sh
export TESTHOME=$(mktemp -d); mkdir -p $TESTHOME/.claude/skills/synced/xlsx
echo x > $TESTHOME/.claude/skills/synced/xlsx/SKILL.md
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | HOME=$TESTHOME bash
[ -f $TESTHOME/.claude/skills/synced/xlsx/SKILL.md ] && echo "INTACT" || echo "REGRESSION"
rm -rf $TESTHOME
```
Expect `INTACT`

**4. Outage resilience**

```sh
export TESTHOME=$(mktemp -d)
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | HOME=$TESTHOME bash
sed -i 's|REPO_URL=.*|REPO_URL="/nonexistent/repo.git"|' $TESTHOME/.claude/install-skills.sh
HOME=$TESTHOME CLAUDE_CODE_REMOTE=true bash $TESTHOME/.claude/session-start.sh 2>&1 >/dev/null
ls $TESTHOME/.claude/skills | wc -l
rm -rf $TESTHOME
```
Expect `install failed; continuing…` on stderr, exit 0, and **30** skills still present.

**5. The real test — a fresh session**

Type `/ask-matt` and ask for something only a synced skill answers ("I need to
make a spreadsheet"). Expect `xlsx` named. If it says no skill covers it, check
`ls ~/.claude/skills` for `synced/` before assuming the router is at fault.

---

## Caveats — not bugs

- **Containers created before `d0076ac` have no manifest**, so the new
  installer's first run deletes nothing stale. Self-corrects after one cycle.
- **The briefing tracks `main`**, since `install-skills.sh` clones it. A skill on
  a branch reaches no session until merged.
- **`~/.claude/skills` is a mirror.** Author skills in `skills/` in this repo.
  Other tools' subdirectories (`synced/`) are now safe; your own loose files
  there are not tracked and will simply be ignored.
- **`handoff` is protected.** It is the only skill with a local edit — store the
  handoff under `handoff/` and push to the working branch. Do not refresh it
  from upstream without porting that forward.
- **The account sync still carries `writing-great-skills`**, so it reappears
  under `synced/` although the repo dropped it for `writing-for-agents`.
  Harmless; remove it in claude.ai if it bothers you.
- **`loop-me` and `claude-handoff`** come from upstream's `in-progress` bucket,
  which may change or vanish without warning.
- **`writing-great-skills`'s 181-line `GLOSSARY.md`** was not carried forward —
  upstream deleted it. Recover with
  `git show 28bd2e8:skills/writing-great-skills/GLOSSARY.md`.
- **The README skill list is hand-maintained**; the briefing is generated.

---

## Setup for the human — one action

Merging covers sessions on this repo. For **every other repo**, paste into
**Claude Code on the web → environment settings → setup script**, once per
environment:

```sh
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | bash
```

## Open, if wanted

- 8 upstream skills deliberately not taken: `writing-fragments`,
  `writing-shape`, `writing-beats`, `setup-ts-deep-modules` (in-progress);
  `git-guardrails-claude-code`, `setup-pre-commit`, `migrate-to-shoehorn`,
  `scaffold-exercises` (misc, tied to their toolchain).
- Generating the README skill list from front matter so it stops drifting.
- Splitting `ask-matt`'s flow map into `FLOWS.md` — by its own branching test the
  map is reference only some runs reach, but inlining keeps the common
  engineering path one hop shorter.
