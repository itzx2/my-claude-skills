# Vendored skills are synced from a record, by an agent with helpers

Most of `skills/` is copied from upstreams, and the first copy of Matt's set
was taken by hand on 2026-08-07 with nothing written down: no pin, no list of
what had been changed on the way in, nothing a later sync could check against.
So a sync now runs from `vendor/record.json` — each upstream's repo and pin,
each entry's status, and for every patch its purpose and a check that proves it
landed. `scripts/vendor.js` does what is mechanical (report what moved, take
files at the pin, verify everything), and an agent following the
`sync-upstream` skill does what needs judgment: putting new and removed
upstream skills to the user, and re-applying each patch from its stated purpose.

## Considered Options

- **A script applying diff patches.** Reproducible, but it fails the moment
  upstream edits near a patched line — `implement` changed exactly there twice
  between pins — and it has no way to decide what to do about a skill upstream
  added or removed. Both cases end in a hand merge with no guidance.
- **An agent working from prose alone.** Adaptable, but nothing is checkable
  and every sync re-derives the whole picture; that is how the unpinned
  August copy happened.
- **`git subtree` or merging an upstream remote.** Upstream layouts move (Matt
  went from flat `skills/` to bucket folders between pins), which breaks
  subtree paths, and every forked skill becomes a recurring merge conflict.

## Consequences

A patch is recorded as intent plus evidence, not as a diff, so it survives
upstream rewording — and its check is what stops it silently disappearing. A
verbatim skill must match upstream byte for byte after the namespace rewrite,
so a quick fix made directly in its folder fails `check`; the fix belongs
upstream, or in the record as a patch.
