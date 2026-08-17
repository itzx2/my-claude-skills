---
name: project-brain
description: Scaffold a project's AGENTS.md router and domain model so any agent can orient cold.
disable-model-invocation: true
---

# Project Brain

## Overview

A project is navigable when an agent reads **one file** and learns where everything else is and why it matters. That file is the **router**. This skill writes it, and scaffolds the three layers it points at.

The router is portable by construction: `AGENTS.md` is plain markdown at a conventional path, so any agent — and any human — reads it without tooling.

## The four layers

| Layer | Holds | Home |
|---|---|---|
| **Navigation** | reading order, what's where, why each matters | `AGENTS.md` — the router |
| **Vocabulary** | the terms every doc and identifier must use | the project's glossary |
| **Decisions** | questions closed, and what they closed off | decision records |
| **State** | what is true today, what is still open | the newest dated handoff |

**The router holds only what stays true across sessions.** Anything dated belongs to State, and the router points at it. Mixing the two is what makes routers rot.

**One router per context.** A repo with `CONTEXT-MAP.md` at its root holds several bounded contexts, each with its own glossary and decisions. Write a router per context, plus a root router that points at them, and run steps 2–7 once per context. Everything below describes a single context.

## Steps

### 1. Survey

Work outside-in, and stop when the picture stops changing:

1. Tree to depth 2, plus every path the manifests name.
2. The root docs — README, `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, anything sitting at top level.
3. Only the docs those point at. Follow links outward; do not sweep directories.
4. `git log --oneline -30` where a repo exists.

Read root files whole. For anything past ~500 lines, read its headings and open only the sections that bear on purpose, stage or constraints. On a large repo it is the doc tree that gets exhausted, never the file tree.

*Done when:* you can write the project's purpose, its stage, and its constraints in three sentences, and name the source file behind each one.

### 2. Classify

Sort what the survey found into the four layers. Record which layers are **empty** — those drive step 5.

Classify **directories and root files**, not every file in the repo. A directory takes one verdict and the files inside inherit it.

*Done when:* every top-level entry and every doc you read is assigned to a layer or marked as neither.

### 3. Adopt the existing names

Find what the project already calls things. A glossary may live at `CONTEXT.md`, `GLOSSARY.md`, `docs/domain.md`, or inside the README. Decisions may be `docs/adr/`, `decisions/`, or a section of a design doc.

Point the router at what exists. Never create a rival under a different name.

*Done when:* each layer has a path or is recorded as empty, and no path duplicates something the project already keeps under another name.

### 4. Extract candidate vocabulary

Collect **domain** terms the project uses repeatedly and defines nowhere — the words for what the thing does and who it does it for, especially any with near-synonyms already in circulation, which is where drift starts.

Leave implementation names out. A module, a service, a wrapper, a queue: these belong in decision records. `domain-modeling` will reject them, because a glossary carries no implementation detail — and collecting them wastes the single batch of questions in step 5.

For the glossary work itself, use the `domain-modeling` skill rather than improvising definitions.

*Done when:* every repeated domain term is either already defined or on the question list, and no implementation name is on it.

### 5. Ask once

Put every open item in **one** message:

- undefined domain terms
- decisions taken but never written down
- constraints you inferred but could not confirm
- **each empty layer, with the path you propose creating for it**

Creating a glossary or a decisions directory changes the project's shape, so it gets proposed here and never done silently.

*Done when:* the answers leave nothing in the router that you had to guess, and every empty layer is either approved for creation or agreed to stay empty.

### 6. Write

Read `templates/AGENTS.md` from this skill's own directory and fill it. Create the layers approved in step 5.

Where a file already exists, update it in place and show what changed. Existing work survives this skill.

Write the upkeep section as **standing rules in the imperative**, never as a `when → do this` table. A rule with no completion state keeps applying for the whole session, which is what makes ordinary work maintain the layers without anyone invoking this skill again. A table only gets consulted by someone already looking for it.

*Done when:* the router names every layer, every entry says why it matters, and the upkeep rules name skills that actually exist in this environment.

### 7. Walk test

Verify all three:

- Every path in the router resolves to a file that exists.
- A reader answers "what is this, and where do I start" from the router plus **two** further reads.
- Each fact has one authoritative home. The router restates a layer's content only for the few constraints an agent must never miss, and attributes each one to its source; everything else stays a pointer.

Check the paths by running them, not by reading them.

*Done when:* all three hold, and every layer is populated or explicitly marked absent.

## Common mistakes

| Mistake | Fix |
|---|---|
| Router lists paths with no reasons | Say why each doc matters — a bare path is what `ls` already gives |
| Router restates the glossary | Point at it; duplicated meaning drifts within a week |
| Dated facts in the router | Move them to the handoff, link to it |
| A second glossary beside the existing one | Adopt the project's own name, always |
| Router grows past a page | It loads every turn; push detail down into the layers |
| Upkeep written as a `when → do this` table | Write standing rules in the imperative — a table gets consulted, rules get obeyed |
| Router enumerates files by number or count | Describe the directory; an enumeration is wrong the next time someone adds one |
| Implementation names proposed for the glossary | They belong in decision records; the glossary stays domain-only |
| Sweeping every file on a large repo | Follow the doc tree outward from the root; the file tree is not the unit |
| A layer created without asking | Empty layers are proposed in step 5, never filled in silently |
