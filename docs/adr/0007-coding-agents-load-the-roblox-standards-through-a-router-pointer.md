# 0007. Coding agents load the Roblox standards through a router pointer

Date: 2026-10-27

## Status

Accepted. Ships as `my-roblox-skills` 1.1.0, with
`/my-roblox-skills:setup-roblox-standards` (issue #24).

## Context

`setup-roblox-standards` writes a Roblox repo's own coding standards from the
plugin's domain skills. The question is who reads them.

The `retro` skill, vendored from mattpocock/skills, holds that
`CODING_STANDARDS.md` is read during review, not implementation: the reviewer
holds a diff and has the least context pressure, so it should impose the
standards, and `AGENTS.md`/`CLAUDE.md` should carry only navigation pointers.

In a Roblox repo that leaves the coding agent writing Luau with only generic
guidance. The user's own failure case was of this kind: a second save path
was added because the code that already owned saving lived only in Studio, and
documentation the coding agent never opened did not prevent it. A review can
reject such a change, but only after the work is done.

## Decision

**Coding agents get a one-line pointer to the standards; the reviewer still
enforces them.**

- The router (`AGENTS.md`) holds one line, between
  `my-roblox-skills:standards` markers: before writing, moving or reviewing
  Luau, read the Roblox standards. The standards themselves stay out of the
  router. When the repo has a `CLAUDE.md`, an `@AGENTS.md` import makes Claude
  Code load the router at all.
- The Roblox briefing carries the same pointer into every subagent, because
  some subagents start without project instructions.
- `my-claude-skills:code-review` stays unchanged and remains the enforcer: it
  is guaranteed to read `CODING_STANDARDS.md`. Mechanical rules go to Selene
  where the repo uses it, as `retro` recommends.
- **The repo's existing name wins.** When standards already live in another
  doc, the sections go there and `CODING_STANDARDS.md` becomes a one-line
  pointer to it, unless the user asks to move the doc instead. One read takes
  the reviewer from the guaranteed name to the real document.

## Consequences

- Every session in a repo with standards pays one router line, and every
  subagent one briefing line. Coding agents read the standards only when they
  touch Luau.
- This departs from `retro`'s reviewer-only doctrine, by the user's explicit
  choice. A future change that wants the standards out of implementation
  removes the pointer and the briefing line, not the standards.
- A repo with no `AGENTS.md` gets one only on approval, holding just a
  description and the pointer; `project-brain` writes a full router.
