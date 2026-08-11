# Handoff — skills briefing, upstream sync, installer

**Date:** 2026-08-11 · **Repo:** `itzx2/my-claude-skills`

For a fresh session picking this up. Supersedes any earlier copy of this file.

Every code and script change described here is on `main` and pushed. This
revision of the document is on `claude/handoff-review-nm87dx` until merged — it
changes no behaviour, only what is recorded.

**Do not trust a container's `main` ref without fetching.** The clone can be
older than the remote, and `git rev-list --left-right main...origin/main` will
happily report `0 0` because *both* refs are stale. That reads as "this work
never landed" and sends you chasing a merge that already happened. Run
`git fetch origin main` first.

## Run this first

Ask the agent to **"run the skills doctor"**. It is a shell script, so the agent
runs it — the human never types this. Three ways to reach it, in order of
convenience:

```sh
bash ~/.claude/doctor.sh                        # cached by every install; works in any session
bash scripts/doctor.sh                          # in a checkout of this repo
curl -fsSL https://raw.githubusercontent.com/itzx2/my-claude-skills/main/scripts/doctor.sh | bash
```

All three print the same report and change nothing. With a checkout it compares
against `skills/`; without one it falls back to
`~/.claude/.my-claude-skills.manifest`, so the cached copy is just as useful in a
session on some other repo.

**Run it before believing any claim that a skill is missing.** It distinguishes
"absent from disk" from "present but unreported", which decides whether the fault
is the installer or whatever is reading the roster. That distinction was the
whole difficulty the first time this went wrong.

One gap: the doctor does not check the manifest entry count, so it reports all
clear on a container whose manifest was corrupted by the hook race in Known
issues. That race is low-severity and fails safe, so this is worth knowing rather
than worrying about — `wc -l < ~/.claude/.my-claude-skills.manifest` should equal
the number of directories in `skills/` (30 today).

It is deliberately **not** wired into the session-start hook. The briefing
already names the full roster every session, so a short or wrong briefing is the
signal; the doctor is the follow-up, and running it unconditionally would spend
output on an all-clear in the common case.

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
| `scripts/doctor.sh` | Read-only diagnosis. Start here. Cached to `~/.claude/doctor.sh` on every install, so it is reachable from any session. |

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

As of 2026-08-11 those six are the whole of `synced/`. It previously also carried
eight `custom` entries — the user's own copies of `grill-with-docs`, `handoff`,
`teach`, `grilling`, `scrutinize`, `karpathy-guidelines`, `domain-modeling` and
`writing-great-skills` — which duplicated this repo and are now gone from the
account. See Known issues for what that resolved.

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

  **Read the other checks before blaming the installer.** If the manifest is
  present, `synced` is absent from it, and the cached installer is the
  manifest-scoped one, then nothing on this container could have deleted
  `synced/` — it is a fresh container waiting on the account sync, not a
  regression. Observed on 2026-08-11: a session started with `synced/` absent and
  it appeared partway through, without a restart. So an `ABSENT` at session start
  is not even final within that session.
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
| 8 | Upstream removal still propagates | stale `writing-great-skills` removed via manifest — **only holds on a single-hook container**; see the hook race in Known issues |
| 9 | Total outage (no HTTP origin, dead git remote) | full briefing from cache, 30 skills intact |
| 10 | Bootstrap idempotency / foreign settings / corrupt settings | no duplicate entry; `env`, `Stop`, git-identity hook preserved; refuses to write over unparseable JSON |
| 11 | New skill added upstream | appears in the **same** session |
| 12 | Skill reclassified / removed upstream | moves bucket / disappears |
| 13 | Briefing edge cases (empty, missing, no front matter, quoted, block scalars) | handled; silent when nothing to say |
| 14 | `doctor.sh` against a broken container | correctly reports pre-fix installer and absent `synced/` |
| 15 | **`/ask-matt` answering a synced-skill question** | passed — "need to make a spreadsheet" named `xlsx` |
| 16 | README skill list vs disk | in sync, 30/30 exact |

Test 15 was the last open question and it closed on 2026-08-11. It is the
end-to-end proof, because it exercises every fix at once: the installer left
`synced/` alone, the sync delivered `xlsx`, the briefing carried the roster, and
the rewritten `ask-matt` routed over the whole roster rather than just this
repo's skills. The original failing run hit two bugs stacked — stale `ask-matt`,
and `synced/` already deleted — so a pass here rules out both.

### Not yet verified

1. **Whether agents recommend user-invoked skills at fitting moments.** Prompt
   behaviour, argued about rather than measured. `skill-creator` can run evals on
   triggering accuracy.

---

## Known issues

- **Two SessionStart hooks race on this repo, and the install is not
  concurrency-safe.** Found 2026-08-11, unfixed. **Low severity — read the
  blast radius below before treating it as urgent.** Nothing is broken today:
  every skill installs and the briefing works.

  Sessions **on this repo** register the hook twice: once user-level in
  `~/.claude/settings.json` (`bash /root/.claude/session-start.sh`, written by
  `bootstrap-env.sh`) and once repo-level in `.claude/settings.json`
  (`$CLAUDE_PROJECT_DIR/scripts/session-start.sh`). Claude Code runs both, in
  parallel, so two `install-skills.sh` processes overlap. Both registrations are
  individually correct — bootstrap covers every *other* repo, and the repo-level
  one covers a session here that never bootstrapped — so the fix belongs in the
  installer, not in deleting a hook.

  Two shared paths have no mutual exclusion: the fixed manifest temp file
  `$MANIFEST.tmp`, and the per-skill `rm -rf` immediately followed by `cp -r`
  into the same destination. Ten trials of the install loop run two-up produced a
  correct manifest **zero** times:

  | Observed | Cause |
  | --- | --- |
  | manifest holds **1 entry** (the last skill alphabetically) | one process `mv`s the temp away; the other's remaining `>>` recreates it with only what it had left |
  | manifest holds 13–20 entries for 10 skills | interleaved appends, duplicated names |
  | `cp: cannot create directory '…/iota': File exists` → **install exits 1** | one process `rm -rf`s a skill dir while the other is mid-`cp` into it |
  | `mv: cannot stat '….tmp'` → **install exits 1** | the other process already claimed the temp |

  This container is in the 1-entry state right now.

  **Blast radius, and why this is not urgent.** The corruption fails safe. Every
  manifest entry is a basename of a directory in the freshly cloned `skills/`,
  and the deletion loop fires only for entries **absent** from that clone. So a
  raced manifest — truncated, duplicated, any subset — produces *zero*
  deletions. The installer cannot remove a skill it should have kept; it can only
  fail to remove one it should have dropped. The failure direction is always
  "deletes less."

  So the whole practical symptom is: remove a skill from `skills/` upstream and a
  stale copy may linger in `~/.claude/skills` instead of disappearing. Test 8
  below passed on a clean container and would fail here. No skill is ever lost,
  no session is left without a briefing, and an install that exits 1 degrades to
  "skills weren't refreshed this session" — the ones on disk are already correct.

  Confined to **this repo**, too. Every other repo carries only the bootstrap
  hook, runs one install, and never races.

  The real everyday cost is smaller and more constant: **both hooks emit a
  briefing**, so every session here pays the ~1315-token payload twice.

  It also hides itself. `session-start.sh` runs the install as
  `… || log "install failed; continuing"`, so a raced, exit-1 install degrades to
  a stderr line nobody reads, and the doctor still reports every skill present —
  because they *are* present, just installed by whichever process won. Only the
  manifest count betrays it. **`doctor.sh` does not check the manifest count
  against the repo's skill count; it should.**

  Fix direction, not yet implemented: serialise the whole install under an
  `flock` on a lockfile, so the second hook waits and then no-ops, rather than
  patching the temp filename alone — a unique temp file fixes the manifest but
  leaves the `rm -rf`/`cp` collision, which is the one that fails the install
  outright. The duplicated briefing in every session on this repo is the same
  root cause and would go with it.

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
- **The README skill list is hand-maintained**; the briefing is generated. It was
  30/30 in sync on 2026-08-11, so this is a drift risk rather than a live defect.

### Resolved on 2026-08-11

Kept here so nobody re-opens them from an older copy of this file.

- **The 7 skills duplicated across `synced/` and this repo.** Two of them
  (`grilling`, `handoff`) differed, and which copy the harness preferred was
  never established. The 8 `custom` skills have since been deleted from the
  claude.ai account — the fix this file recommended — so `synced/` now holds only
  the Anthropic six and the ambiguity is gone. `doctor.sh` reports no duplicates.
  It still checks, so the guard remains if any are ever re-added.
- **`writing-great-skills` syncing from the account** after the repo replaced it
  with `writing-for-agents`. Went with the other seven `custom` entries.

Both were account-side state, not repo state, so no commit here caused the fix
and no commit can regress it. Re-adding a custom skill to the claude.ai account
brings the duplicate back.

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
