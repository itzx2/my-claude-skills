---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document that hands **this** session to a **new working agent**
— one that has not seen this conversation and never will.

That agent has your files and your git history. What it lacks is everything that
only ever existed in the conversation: why a path was abandoned, which decision
is settled, what you were about to do next. Carry that; leave the rest where it
already lives.

## One live handoff, ever

`docs/handoff/` holds **exactly one file** — the live brief. Every earlier one
lives in `docs/handoff/archive/`, which nothing reads: not you while writing,
not the agent receiving this.

That is structural on purpose. A handoff is a snapshot of a single session,
written once and never edited. When two are readable at once the newer one starts
explaining the older one instead of standing on its own, and the next agent
inherits a chain to read backwards rather than a brief to act on.

So a handoff **never cites another handoff** — it does not correct one, summarise
one, or mark parts of one still good. Moving the old file to
`docs/handoff/archive/` is what marks it stale; that is the only statement about
it you ever make.

## Published

A handoff is **published** the moment this invocation ends, and a published
handoff is a fixed record — to every session, including this one. This
invocation is the only window in which any handoff is written, and the way to
change what a published handoff says is a later invocation that writes a new
one.

That rule governs sessions that never run this skill, so it cannot live only
here. Step 5 plants it where those sessions read.

## Steps

All of this happens on invocation. Nothing here is left for the user to remember.

1. **Migrate.** If `handoff/` sits at the repo root and `docs/handoff/` does
   not, `git mv` the folder so history follows, and rewrite every `handoff/`
   path in `AGENTS.md`, `CLAUDE.md` and any doc that routes to it — a router
   pointing at a folder that moved is worse than one pointing at an untidy one.
   Say in the chat what moved. Where `docs/handoff/` already exists, this is a
   no-op; where both exist, stop and ask.
2. **Rescue.** If `docs/handoff/` holds a file, read it once — solely to find
   anything still true that lives **nowhere else**. Move each such fact *out* to
   where it belongs: an ADR, `CONTEXT.md`, the issue it concerns, or a comment
   beside the code. Content travels out to a primary source, never into the new
   handoff.
3. **Archive.** `git mv` every file currently in `docs/handoff/` into
   `docs/handoff/archive/`, creating that folder if needed, and leaving
   `README.md` in place. A first run moves nothing; a folder that has
   accumulated several moves all of them.
4. **Write** the new file at `docs/handoff/YYYY-MM-DD-<slug>.md`. The slug names
   the work, not the session.
5. **Plant the rule.** Copy [`README-TEMPLATE.md`](README-TEMPLATE.md) to
   `docs/handoff/README.md`, overwriting it, so its wording has one source. Then
   put the rule where every session reads it — `AGENTS.md` if the repo has one,
   otherwise `CLAUDE.md` — adding this if it is absent and correcting the paths
   if it is present:

   > `docs/handoff/` holds exactly one handoff — the live brief. Read it; leave
   > `docs/handoff/archive/` alone. A handoff is **published** the moment the
   > invocation that wrote it ends, and a published handoff is read-only to
   > every session including the one that wrote it: the way to change what one
   > says is a new one, written by the `handoff` skill, which is the only thing
   > that writes them. It is user-invoked — `/handoff`, or
   > `/my-claude-skills:handoff` as a plugin — so it will not appear in your own
   > skill listing. A brief going stale is its normal condition, not a defect:
   > say so once if it matters and let the user invoke the skill.

6. **Send it to the chat** so the user sees it without opening the file.
7. **Commit and push** the new file, the archive moves, and any migration
   together, on the current working branch.

## Template

Every section appears. When one is genuinely empty write `None` — a section
padded to look full is worse than one honestly blank.

````markdown
# <Title: the work, not the session>

> **Stale once replaced.** The live brief is the single file in `docs/handoff/`.
> If you are reading this from `docs/handoff/archive/`, a later handoff has
> replaced it — read that one instead.

## Task
What this work is, in a sentence or two, and what finishing it looks like.

## State
Current branch. What is committed and pushed, what is uncommitted, what is
running or half-applied. Anything that would surprise someone who just cloned.

## Artifacts
Paths and URLs to the specs, plans, ADRs, issues, PRs, and diffs that already
hold the detail. One line each saying what the reader will find there.

## Decisions
Calls already settled, each with the reason that settled it — so the next agent
extends them rather than reopening them.

## Open
What is still undecided, and what each one is waiting on.

## Next action
The single concrete thing to do first. Not a list.

## Suggested skills
Skill names the next agent should reach for, one line each on why.
````

## Rules

- **Reference, don't restate.** Anything already in a spec, plan, ADR, issue,
  commit, or diff goes in **Artifacts** as a path or URL. The doc carries only
  what lives nowhere else.
- **Never point at another handoff.** It is the one artifact that is never a
  valid reference — an archived one is stale by definition, and knowledge worth
  keeping was rescued to a primary source in step 2. Point at that source
  instead.
- **Redact secrets.** API keys, tokens, passwords, personal data: replace each
  with a description of what it is and where it is kept, so the next agent knows
  to fetch it rather than that it exists.
- **Arguments set the aim.** Anything passed to this skill describes what the
  next session is for — write the doc toward that, and say so in **Task**.

## Done when

A fresh agent, given only this file, can name the next action and take it —
without asking you a question, without reading this conversation, and **without
opening any other handoff**.

The file is published the moment this invocation ends. Anything you would have
added to it belongs in the next handoff instead.
