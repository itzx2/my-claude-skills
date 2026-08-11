# Handoff — session-start skills briefing + upstream sync

**Date:** 2026-08-11
**Merged to `main`:** `b533483`
**Repo:** `itzx2/my-claude-skills`

Read this if you are a fresh session asked to verify the work landed correctly.
Everything below has been tested, including a live run against merged `main`.
Your job is to confirm it still holds, not to rebuild it.

---

## What was built

### 1. A per-session skills briefing (the main thing)

Claude Code hides any skill with `disable-model-invocation: true` from the
agent **entirely** — the agent cannot see it, invoke it, or suggest it, because
it has no idea the skill exists. That is 17 of the 30 skills in this repo.

A `SessionStart` hook now installs the skills and then injects a briefing
listing all of them, split into two groups:

- **Model-invokable** (13) — already in the agent's Skill listing; the briefing
  is a compact recall aid plus a nudge to prefer a skill over improvising.
- **User-invoked only** (17) — name and description for each, plus instructions
  to *recommend* rather than invoke, at most one per reply. This section is the
  only place an agent ever learns these exist.

The payload also sets `reloadSkills: true`, so a session picks up skills the
same hook installed seconds earlier rather than running on a stale list.

### 2. Upstream sync with `mattpocock/skills`

16 of 21 shared skills had drifted — his side had gained content, including
cross-links between skills that break when only half the set is current.

- Refreshed 15 stale skills.
- **`handoff` deliberately left alone** — it is the only skill with a local
  edit (store the handoff under `handoff/`, push to the working branch).
  Refreshing it would revert that. Treat it as protected.
- Added `wizard`, `writing-for-agents`, `to-questionnaire`, `wait-what`,
  `loop-me`, `claude-handoff`.
- Dropped `writing-great-skills` — upstream renamed it to `writing-for-agents`,
  so keeping both was the same skill twice.

**Net: 25 → 30 skills.**

---

## The four scripts

| File | Role |
| --- | --- |
| `scripts/bootstrap-env.sh` | The only thing a human pastes. Registers the hook in `~/.claude/settings.json` and installs. Run once per environment. |
| `scripts/session-start.sh` | The hook itself. Installs (remote only), then briefs. |
| `scripts/install-skills.sh` | Mirrors `skills/` → `~/.claude/skills` and caches the three scripts into `~/.claude/`. |
| `scripts/skills-briefing.py` | Reads front matter, emits the `additionalContext` payload. |

Flow:

```
setup script (pasted once per environment)
  └─ bootstrap-env.sh ── writes hook into ~/.claude/settings.json
                      └─ install-skills.sh ── skills + scripts → ~/.claude/

every session after
  └─ ~/.claude/session-start.sh ── refresh skills (best-effort)
                                └─ skills-briefing.py → briefing
```

Two design points that are load-bearing, please do not "simplify" them away:

- **The hook runs a local path, not `curl … | bash`.** Fetching the hook script
  every session made the briefing hostage to the network: with GitHub
  unreachable a session got *no briefing at all*, despite skills already being
  cached on disk. `install-skills.sh` refreshes the cached copies on every
  successful install, so they stay current without a per-session fetch.
- **Cached scripts install via `mv`, not `cp`.** `install-skills.sh` can
  overwrite `session-start.sh` while that file is the running script, and bash
  reads scripts incrementally by byte offset. In-place `cp` would make bash
  resume into garbage; `mv` is an atomic rename, so the running shell keeps its
  handle on the old inode.

---

## Verification checklist

Run these from a clone of `main`. Expected results are stated; anything else is
a regression.

### 1. Front matter is valid across all skills

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

**Expect:** `30 skills; no issues`

### 2. Briefing generates and buckets correctly

```sh
CLAUDE_SKILLS_DIR=./skills python3 scripts/skills-briefing.py \
  | python3 -c 'import json,sys; c=json.load(sys.stdin)["hookSpecificOutput"]["additionalContext"]; print(c)'
```

**Expect:** valid JSON in, readable Markdown out; 13 model-invokable entries,
17 `/`-prefixed user-only entries.

### 3. Live end-to-end, exactly as a real environment runs it

```sh
export TESTHOME=$(mktemp -d)
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | HOME=$TESTHOME bash
HOME=$TESTHOME CLAUDE_CODE_REMOTE=true bash $TESTHOME/.claude/session-start.sh | head -c 300
rm -rf $TESTHOME
```

**Expect:** `registered SessionStart hook`, `Installed 30 skills into …`, then a
JSON payload beginning `{"hookSpecificOutput": {"hookEventName": "SessionStart"`.

> Use a temp `HOME`. Running this with your real `HOME` will `rm -rf` your
> `~/.claude/skills`, which is fine on a cloud container but destroys the
> symlink on a local machine.

### 4. Resilience — the briefing must survive an outage

Point the cached installer at a dead remote and confirm the session is still
briefed from cache, with skills left intact:

```sh
export TESTHOME=$(mktemp -d)
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | HOME=$TESTHOME bash
sed -i 's|REPO_URL=.*|REPO_URL="/nonexistent/repo.git"|' $TESTHOME/.claude/install-skills.sh
HOME=$TESTHOME CLAUDE_CODE_REMOTE=true bash $TESTHOME/.claude/session-start.sh 2>&1 >/dev/null
ls $TESTHOME/.claude/skills | wc -l
rm -rf $TESTHOME
```

**Expect:** stderr says `install failed; continuing with whatever is already
in …`, exit 0, and **30 skills still present** — `set -e` aborts the installer
before its `rm -rf`, so a network failure cannot leave you with no skills.

### 5. The hook fires in a real session

Any session opened on this repo runs the hook via the committed
`.claude/settings.json`. Confirm by checking your own context for a
`SessionStart hook additional context` block titled
*"Installed personal skills (itzx2/my-claude-skills)"*.

If you can see that block, and your Skill tool lists exactly the 13
model-invokable skills while the briefing names all 30, the feature is working.

---

## Known caveats — not bugs

- **The briefing tracks `main`, not your checkout.** `install-skills.sh` clones
  `main`, so a skill added on a branch will not appear anywhere until merged.
- **`~/.claude/skills` is a mirror, not a workspace.** Every install does
  `rm -rf` on it. Do not author skills there; they will be wiped. Author in
  `skills/` in this repo.
- **`handoff` is protected.** Do not refresh it from upstream without porting
  its local edit forward.
- **`loop-me` and `claude-handoff` come from upstream's `in-progress` bucket**,
  which its README says can change or disappear without warning.
- **`writing-great-skills`'s 181-line `GLOSSARY.md` was not carried forward.**
  Upstream deleted it in the rename rather than relocating it — confirmed by
  searching their whole repo. Recoverable here if wanted:
  `git show 28bd2e8:skills/writing-great-skills/GLOSSARY.md`
- **The README skill list is hand-maintained.** The briefing is generated and
  needs no edit when skills change; the README does. It can be regenerated from
  front matter if that drift becomes annoying.

---

## Remaining setup for the human (one action)

Merging covers sessions opened on *this* repo. For **every other repo**, paste
this into **Claude Code on the web → environment settings → setup script**,
once per environment:

```sh
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | bash
```

Idempotent, preserves existing settings and hooks, and refuses to write over a
settings file it cannot parse.

## Still open, if anyone wants it

- 8 upstream skills were deliberately not taken: `writing-fragments`,
  `writing-shape`, `writing-beats`, `setup-ts-deep-modules` (in-progress), and
  `git-guardrails-claude-code`, `setup-pre-commit`, `migrate-to-shoehorn`,
  `scaffold-exercises` (misc, tied to their toolchain).
- Generating the README skill list from front matter, so it stops drifting.
