---
name: sync-upstream
description: Sync this plugin's vendored skills from an upstream (mattpocock, emilkowalski, superpowers, claude-kit) to a new pin, driven by vendor/record.json and scripts/vendor.js. Use when asked to sync, update or pull skills from an upstream, to vendor a new upstream skill or plugin, or to change a vendored entry's status.
---

# Sync an upstream

`vendor/record.json` is the **vendor record**: each upstream's repo and pin, and the status of every entry it offers (see the Vendoring terms in `GLOSSARY.md`). `scripts/vendor.js` does the mechanical work; the decisions and the patch re-application are yours. The record is the source of truth: when the record and a skill folder disagree, `check` says so.

## 1. See what moved

```sh
node scripts/vendor.js report <upstream>
```

It lists entries that are new upstream, removed upstream, moved to a new path, and changed since the pin, with the upstream commit subjects for each. Read the commits behind anything changed in a **patched** or **forked** entry before going further: those are where judgment is needed.

## 2. Put the decisions to the user, in one round

- each **new** upstream entry: verbatim, patched (and the edit's purpose), or skipped;
- each **removed** entry: drop ours (status skipped, with a note) or keep it as forked;
- each **forked** entry whose upstream changed: what, if anything, to merge by hand.

Give a recommendation for each. Record every answer in `vendor/record.json` as you get it: status, path, and a `note` saying why.

## 3. Move the pin and take the entries

```sh
node scripts/vendor.js pin <upstream> <ref>          # usually origin/HEAD
node scripts/vendor.js take <upstream> <entry>       # each verbatim and patched entry
```

`take` replaces the entry's folder with upstream's files at the pin. For an upstream marked `"rewrite": "namespace"` it also rewrites skill references to full invocations, because a bare name is not reliable: the Skill tool resolves some and answers "Unknown skill" for others that a hidden built-in shadows. If the set of shipped skills changed in this sync, take everything a second time so the rewrite sees every name. Delete the folders of entries that are now skipped or absorbed.

## 4. Re-apply each patch from its purpose

For each patched entry, read every patch's `purpose` and make that edit to the fresh upstream text. Where upstream rewrote the area, carry the intent into the new wording rather than restoring the old lines, and update the patch's `checks` if the evidence string had to change. Write skill references in patch text as full invocations (`"my-claude-skills:<name>"`), the same as the rewrite does.

## 5. Merge forked entries by hand

Use the report's commits as the list. `ask-matt` always needs this: every user-reachable skill added or removed in the sync gets its route added or removed there.

## 6. Check, then release

```sh
node scripts/vendor.js check
```

Repeat until it prints `✔ vendor record holds`, then run the other checks `CLAUDE.md` lists before pushing. Update the README's skill list and its *Vendored skills* section, bump the version in both manifests, and commit. The tag comes after the merge, as `CLAUDE.md` describes.
