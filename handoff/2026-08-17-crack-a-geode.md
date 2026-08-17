# Handoff — Crack-a-Geode push

**Written:** 2026-08-17
**Previous focus:** turning `itzx2/my-claude-skills` into a Claude Code plugin
**Next focus:** push "only the necessary files" to `itzx2/Crack-a-Geode`

---

## Next session's job

Push the necessary files to **[itzx2/Crack-a-Geode](https://github.com/itzx2/Crack-a-Geode)** (private).

### What I established

| Fact | Value |
| --- | --- |
| Default branch | `main` @ `fc37afb` |
| Tracked files | `README.md` (15 B), `design.html` (65 KB) |
| Local working copy | **none found** |

I searched `F:\Users\first`, `…\Desktop`, `…\Documents`, and `…\Desktop\CRG_Work`. No `Crack-a-Geode` directory exists on this machine. Sibling projects (`LinguaChecker`, `Voice of Customer`) do live under `CRG_Work`, so that is the likely home — but it is not there yet.

### Blocking question — resolve this first

**"Only the necessary files" has no defined source and no defined filter.** Do not guess. Two unknowns:

1. **Where are the files?** Nothing is checked out locally. Either the user points at a directory, or the repo needs cloning first and the files arrive from elsewhere.
2. **Necessary by what rule?** Plausible readings: exclude build artifacts and dependencies; exclude secrets; ship only what `design.html` needs to render. These produce very different file sets.

Ask before touching the remote. A wrong push to a private repo is recoverable but noisy.

### Cautions

- The repo is **private**. Keep it that way; do not change visibility.
- `F:\Users\first\Desktop\CRG_Work\` contains a plaintext credentials file (`Supabase Database Pass.txt`). It is **not** in the Crack-a-Geode tree, but if the source directory ends up under `CRG_Work`, verify it is excluded before any `git add`. Never commit it.
- Check for a `.gitignore` before adding anything; the repo may not have one yet.

### Unverified hypothesis

`design.html` is a 65 KB standalone HTML file, which is the shape `diagram-design` emits. If the work involves regenerating or editing it, that plugin is installed and relevant. I did not open the file — treat this as a lead, not a fact.

---

## Where the previous work landed

All of it is committed and pushed; do not re-derive it from this document.

| What | Reference |
| --- | --- |
| Plugin manifests added | [`eb63099`](https://github.com/itzx2/my-claude-skills/commit/eb63099) |
| Briefing hook + namespacing (v1.1.0) | [`7da54dc`](https://github.com/itzx2/my-claude-skills/commit/7da54dc) |
| Roster logic | `hooks/briefing.js` |
| Hook registration | `hooks/hooks.json` |
| Router over all skills | `skills/ask-matt/SKILL.md` |
| Rationale + install docs | `README.md` |

State: `my-claude-skills` v1.1.0 installed at user scope, enabled, hook active. Alongside it, `superpowers` 6.3.0 and `diagram-design` 2.3.5.

### Still open from that work

- `writing-great-skills` exists only at `~/.claude/skills/writing-great-skills`, not in this repo, so it does not sync to other machines. Offered to fold in; not actioned.
- Stale pre-plugin clone backed up at `~/.claude/skills-stale-clone-backup-20260814-204850`. Safe to delete once v1.1.0 is confirmed good.

---

## Environment gotchas

Non-obvious, cost real time to find, and none of it is visible from the repo.

- **`bash` resolves to WSL**, not Git Bash (`F:\Windows\system32\bash.exe`). Git Bash is at `F:\Program Files\Git\bin\bash.exe` — a non-standard drive that hardcoded `C:\Program Files\Git\...` probes miss. Superpowers' own hook shim misses it.
- **`python3` is the Microsoft Store stub.** Real interpreter: `F:\Python314\python.exe` (3.14.6).
- **Prefer Node** for any scripting that must run reliably here: v24.18.0, `F:\Program Files\nodejs`.
- **Global git identity is unset.** Commit with `-c user.name="itzx2" -c user.email="yottanaat@gmail.com"` to match existing history rather than writing global config.
- **`claude` is not on this shell's PATH** mid-session. Prepend `;F:\Users\first\.local\bin` or call the exe directly. It *is* on the user PATH for new terminals.
- **Plugin skills are namespaced** `plugin:skill`. Bare `/to-spec` no longer resolves; use `/my-claude-skills:to-spec`.
- **Updating a plugin needs two steps:** `claude plugin marketplace update <name>` to refresh the cached clone, then `claude plugin update <name>@<marketplace>`. The update alone reports "not found".

---

## Suggested skills

- **`/my-claude-skills:grill-with-docs`** — run this first. The blocking question above is exactly a scoping interview, and it leaves the answer in `CONTEXT.md` rather than only in chat. Use `/my-claude-skills:grill-me` if working outside a repo.
- **`superpowers:verification-before-completion`** — before reporting the push as done. Confirm with `git log` and `gh repo view` against the remote; do not claim success from a command that merely exited 0.
- **`my-claude-skills:resolving-merge-conflicts`** — only if the push is rejected and a real merge is needed. It resolves by intent and never runs `--abort`.
- **`diagram-design:diagram-design`** — only if the `design.html` hypothesis holds and the file needs regenerating.
- **`/my-claude-skills:ask-matt`** — if none of the above fits. It routes over the full installed roster, which now includes the 18 user-invoked skills the SessionStart briefing surfaces.

---

## Redaction

No credentials, tokens, or keys appear in this document. The `gh` token is held in the OS keyring and was never read. One credentials **filename** is named above solely so it can be excluded from a commit; its contents were never opened.
