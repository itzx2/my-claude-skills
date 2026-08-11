# Handoff — skills briefing, upstream sync, installer

**Date:** 2026-08-11 · **Repo:** `itzx2/my-claude-skills` · everything below is on `main` and pushed.

For a fresh session picking this up. Supersedes any earlier copy of this file.

## Run this first

```sh
bash scripts/doctor.sh
```

Read-only. It reports what is installed, whether the installer is the fixed one,
whether the account-synced skills survived, and which skills exist in two places.
**Run it before believing any claim that a skill is missing** — it distinguishes
"absent from disk" from "present but unreported", which decides whether the fault
is the installer or whatever is reading the roster.

---

## What this repo does

Skills live in `skills/`. A `SessionStart` hook installs them into
`~/.claude/skills` and injects a **briefing** naming all of them, so an agent
starts every session knowing the full roster.

The briefing exists because Claude Code hides any skill with
`disable-model-invocation: true` from the agent **entirely** — it cannot see,
call, or suggest what it does not know exists. That is 17 of the 30 skills here.

- **Model-invokable** — already in the agent's Skill listing; the roster is a
  recall aid, so descriptions are trimmed to a first sentence.
- **User-invoked** — full descriptions, because the briefing is the *only*
  surface they appear on. Trimming these destroys their only trigger info.

`reloadSkills: true` makes the session re-scan so it sees what the hook just
installed.

Counts vary by environment: this repo contributes 30, and the briefing also picks
up anything else sitting in `~/.claude/skills` (one container reports 31 because
the environment's own `session-start-hook` is installed there). That is correct
behaviour, not drift.

### The scripts

| File | Role |
| --- | --- |
| `scripts/bootstrap-env.sh` | The only thing a human pastes. Registers the hook in `~/.claude/settings.json`, installs. Once per environment. |
| `scripts/session-start.sh` | The hook. Installs (remote only), then briefs. |
| `scripts/install-skills.sh` | Mirrors `skills/` → `~/.claude/skills`, caches the scripts into `~/.claude/`. |
| `scripts/skills-briefing.py` | Reads front matter, emits the `additionalContext` payload. |
| `scripts/doctor.sh` | Read-only diagnosis. Start here. |

```
setup script (pasted once per environment)
  └─ bootstrap-env.sh ── hook → ~/.claude/settings.json
                      └─ install-skills.sh ── skills + scripts → ~/.claude/
every session after
  └─ ~/.claude/session-start.sh ── refresh skills (best-effort)
                                └─ skills-briefing.py → briefing
```

---

## Disappeared skills — the failure you are most likely to hit

**Symptom:** a document skill is gone (`xlsx`, `docx`, `pptx`, `pdf`), the
briefing is short, or `/ask-matt` reports that nothing covers a task.

### Where those skills actually live

They are **not** built in and nothing shields them. Claude Code syncs them from
the claude.ai account into `~/.claude/skills/synced/` as ordinary directories,
listed in `synced/manifest.json` with a `skillId` and source per entry:

| Source | Skills |
| --- | --- |
| `anthropic` | `xlsx`, `docx`, `pptx`, `pdf` |
| `anthropic-example` | `skill-creator`, `morning` |
| `custom` (the user's own) | `grill-with-docs`, `handoff`, `teach`, `grilling`, `scrutinize`, `karpathy-guidelines`, `domain-modeling`, `writing-great-skills` |

Because they are just files in `~/.claude/skills`, any script that clears that
directory deletes them. That is exactly what happened.

### What went wrong, and what fixed it

`install-skills.sh` used to run `rm -rf "$HOME/.claude/skills"` before copying,
so every session start destroyed `synced/`. A real session then ran `/ask-matt`
asking for a spreadsheet and correctly answered that **no skill covers it** —
because by then `xlsx` genuinely was not installed. `dataviz` was still offered
because it is not on disk and so was never deleted; that asymmetry is what
identified the cause.

The installer now records what it installs in
`~/.claude/.my-claude-skills.manifest` and replaces **only those** directories.
Deletion is still needed so a skill removed upstream disappears rather than
lingering, so the manifest — not the whole directory — bounds what may be removed.

### Diagnosing it next time

Run `scripts/doctor.sh`. It prints one of:

- `synced/ is ABSENT` → the skills really are gone. Either a pre-fix installer
  ran, or the account sync has not landed yet. It re-syncs on its own; a session
  started before that runs without them.
- `cached installer is PRE-FIX` → this container carries an old cached copy.
  Re-run the bootstrap line to refresh it immediately.
- Everything `ok` → the skills are present, so a report of "missing" is about
  whatever is reading the roster, not the installer.

### Residual risk, and why no staleness guard was added

A container built from an image baked before the fix carries the pre-fix cached
installer, which gets **one destructive run** before caching its replacement.
`synced/` re-syncs afterwards, so the cost is at most one session without those
skills.

A guard in `session-start.sh` was considered and rejected: a stale
`session-start.sh` would not contain the guard either, so it cannot fix the case
it targets — it only protects against *future* installer changes, and the
installer is now non-destructive by design. Re-running `bootstrap-env.sh` is the
cheaper answer for any container still holding old copies.

---

## Three decisions that look like over-engineering and are not

Each fixes a bug that actually occurred. Please do not "simplify" them away.

1. **Manifest-scoped deletion** — above.
2. **The hook runs a local path, not `curl … | bash`.** Fetching it per session
   made the briefing hostage to the network: with GitHub unreachable a session
   got no briefing at all despite skills sitting on disk.
3. **Cached scripts install via `mv`, not `cp`.** `install-skills.sh` can
   overwrite `session-start.sh` while that file is the running script, and bash
   reads scripts incrementally by byte offset. In-place `cp` makes bash resume
   into garbage; `mv` is an atomic rename, so the running shell keeps the old
   inode.

---

## Test results

### Verified

| # | Test | Result |
| --- | --- | --- |
| 1 | Front matter across all 30 skills (`name` matches directory, description present, under 1024 chars, no duplicates) | no issues |
| 2 | Briefing generation | valid JSON, `reloadSkills: true`, ~1315 tokens |
| 3 | Live deploy from `main` into a clean `HOME` | hook registered, 30 installed, briefing emitted |
| 4 | `synced/` preserved — sandbox, live deploy, first install, re-run | `synced/xlsx` INTACT in all four |
| 5 | **Live container after the fix** | `synced/` 14 skills, `xlsx`/`docx`/`pptx`/`pdf` all reachable |
| 6 | Environment's own `session-start-hook` at top level | **survived** — collateral damage under the old installer |
| 7 | `synced` absent from the manifest | confirmed — installer cannot delete it |
| 8 | Upstream removal still propagates | stale `writing-great-skills` removed via manifest |
| 9 | Total outage (no HTTP origin, dead git remote) | full briefing from cache, 30 skills intact |
| 10 | Bootstrap idempotency / foreign settings / corrupt settings | no duplicate entry; `env`, `Stop`, git-identity hook preserved; refuses to write over unparseable JSON |
| 11 | New skill added upstream | appears in the **same** session |
| 12 | Skill reclassified / removed upstream | moves bucket / disappears |
| 13 | Briefing edge cases (empty, missing, no front matter, quoted, block scalars) | handled; silent when nothing to say |
| 14 | `doctor.sh` against a broken container | correctly reports pre-fix installer and absent `synced/` |

### Not yet verified

1. **`/ask-matt` answering a synced-skill question.** The one real run hit both
   bugs at once — stale `ask-matt`, and `synced/` already deleted. With both
   fixed, `/ask-matt` "I need to make a spreadsheet" should now name `xlsx`.
   **Only the human can run this** — `ask-matt` is user-invoked.
2. **Whether agents recommend user-invoked skills at fitting moments.** Prompt
   behaviour, argued about rather than measured. `skill-creator` can run evals on
   triggering accuracy.

---

## Known issues

- **7 skills exist in both `synced/` and this repo**, and two differ:
  `grilling` and `handoff` (synced copies dated 2026-07-01 and 2026-07-15,
  predating the upstream refresh). Which copy the harness prefers is **not
  verified** — do not guess. The clean fix is deleting the 8 `custom` skills from
  the claude.ai account, since this repo is their source of truth and syncs them
  everywhere already. That leaves `synced/` holding only the Anthropic skills.
  `doctor.sh` flags these.
- **`writing-great-skills` still syncs from the account** although the repo
  dropped it for `writing-for-agents`.
- **A foreign skill can have `name` ≠ directory** — the environment's
  `session-start-hook` directory declares `name: startup-hook-skill`, and the
  briefing uses the `name` field. Harmless, but explains a mismatch.
- **Containers created before the installer fix have no manifest**, so its first
  run deletes nothing stale. Self-corrects after one cycle.
- **The briefing tracks `main`** — a skill on a branch reaches no session until
  merged.
- **`handoff` is protected.** It is the only skill with a local edit (store the
  handoff under `handoff/`, push to the working branch). Do not refresh it from
  upstream without porting that forward.
- **`loop-me` and `claude-handoff`** come from upstream's `in-progress` bucket,
  which may change or vanish without warning.
- **`writing-great-skills`'s 181-line `GLOSSARY.md`** was not carried forward —
  upstream deleted it. Recover with
  `git show 28bd2e8:skills/writing-great-skills/GLOSSARY.md`.
- **The README skill list is hand-maintained**; the briefing is generated.

---

## Setup for the human

Sessions on this repo are covered by the committed `.claude/settings.json`. For
**every other repo**, paste into **Claude Code on the web → environment settings
→ setup script**, once per environment:

```sh
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/bootstrap-env.sh | bash
```

## Open, if wanted

- 8 upstream skills deliberately not taken: `writing-fragments`, `writing-shape`,
  `writing-beats`, `setup-ts-deep-modules` (in-progress);
  `git-guardrails-claude-code`, `setup-pre-commit`, `migrate-to-shoehorn`,
  `scaffold-exercises` (misc, tied to their toolchain).
- Generating the README skill list from front matter so it stops drifting.
- Splitting `ask-matt`'s flow map into `FLOWS.md` — by its own branching test the
  map is reference only some runs reach, but inlining keeps the common
  engineering path one hop shorter.
