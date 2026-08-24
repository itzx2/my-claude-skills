---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document so a fresh agent can continue this work with **no access to this conversation**.

That agent has your files and your git history. What it lacks is everything that
only ever existed in the conversation: why a path was abandoned, which decision
is settled, what you were about to do next. Carry that; leave the rest where it
already lives.

## Steps

1. **Write the file** to `handoff/YYYY-MM-DD-<slug>.md`, creating `handoff/` if
   it does not exist. The slug names the work, not the session.
2. **Send it to the chat** so the user sees it without opening the file.
3. **Commit and push** it to the current working branch.

## Template

Every section appears. When one is genuinely empty write `None` — a section
padded to look full is worse than one honestly blank.

```markdown
# <Title: the work, not the session>

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
```

## Rules

- **Reference, don't restate.** Anything already in a spec, plan, ADR, issue,
  commit, or diff goes in **Artifacts** as a path or URL. The doc carries only
  what lives nowhere else.
- **Redact secrets.** API keys, tokens, passwords, personal data: replace each
  with a description of what it is and where it is kept, so the next agent knows
  to fetch it rather than that it exists.
- **Arguments set the aim.** Anything passed to this skill describes what the
  next session is for — write the doc toward that, and say so in **Task**.

## Done when

A fresh agent, given only this file, can name the next action and take it —
without asking you a question, and without reading this conversation.
