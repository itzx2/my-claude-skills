---
name: ask-matt
description: Ask which skill or flow fits your situation. A router over every skill installed in this session.
disable-model-invocation: true
---

# Ask Matt

You don't remember every skill, so ask.

This routes over **every skill installed in this session** — the engineering skills mapped below, the personal ones beside them, and whatever the environment or a plugin brought along.

## 1. Build the roster

Answer from what is actually installed right now, never from memory of what this repo used to hold. Read all three sources — each one holds skills the others omit:

- **Your Skill tool listing** — every model-invokable skill, with full descriptions. Includes environment and plugin skills.
- **The SessionStart briefing** — the `Installed personal skills` block, whose user-invoked section is the only place skills with `disable-model-invocation: true` appear.
- **`ls ~/.claude/skills`** — the backstop that catches anything installed but absent from both.

That is the roster. It supersedes every name below: a skill in the roster is available even when this map omits it, and a name here that the roster lacks is gone.

## 2. Match the situation against the whole roster

Weigh **every** entry in the roster against what the user described. The map below carries relationships no description states — which skill precedes which, and which of two overlapping skills wins — so use it for the skills it covers, and match the rest on their descriptions alone.

The completion criterion is coverage: **every roster entry considered**. A skill from outside this map is as good an answer as one inside it — recommend by fit, and say plainly when the best fit is a skill this map never mentions.

## 3. Recommend

Name the exact invocation (`/name`), say in one sentence what it buys, and give the order when several chain. Recommend every skill that fits, and say when nothing does.

---

# The map

Most paths run along one **main flow**, with two **on-ramps** merging onto it. Everything else is standalone, or a vocabulary layer running underneath.

## The main flow: idea → ship

1. **`/grill-with-docs`** — sharpen the idea by interview. Start here whenever you are **working in a working directory**: it's stateful, retaining what it learns in `CONTEXT.md` and ADRs. Outside a working directory use `/grill-me`. Both run the same `/grilling` primitive; `grill-with-docs` leaves the paper trail, so it wins wherever a repo exists to leave it in.
2. **Branch — can you settle every question in conversation?** If a question needs a runnable answer (state, business logic, a UI you have to see), detour through a prototype, bridged by **`/handoff`** in both directions:
   - **`/handoff`** out, then open a fresh session against that file,
   - **`/prototype`** to answer the question with throwaway code,
   - **`/handoff`** back what you learned, and reference it from the original idea thread.
3. **Branch — is this a multi-session build?**
   - **Yes** → **`/to-spec`** (turn the thread into a spec), then **`/to-tickets`** to split it into tracer-bullet tickets, each declaring its **blocking edges**. On a local tracker that's one file per ticket under `.scratch/<feature>/issues/`, worked blockers-first by hand; on a real tracker the edges become native blocking links, so any ticket whose blockers are done can be grabbed — kick off **`/implement`** per ticket, **`/clear`ing context between each one**. Each ticket is self-contained, so the last one's context is disposable.
   - **No** → **`/implement`** right here, in the same context window.

   Either way, **`/implement`** drives **`/tdd`** internally — one red-green slice at a time — then closes out by running **`/code-review`** before committing. Reach for **`/tdd`** alone to build a concrete behaviour test-first without a full spec, and **`/code-review`** alone to review a branch or PR against a fixed point.

### Context hygiene

Keep steps 1–3 in **one unbroken context window** — compact or clear only after `/to-tickets` — so the grilling, spec, and tickets all build on the same thinking. Each `/implement` then starts fresh from the ticket.

The limit is the **[smart zone](https://www.aihero.dev/ai-coding-dictionary/smart-zone)**: the window (~150k tokens on state-of-the-art models) within which the model still reasons sharply. If a session approaches it before `/to-tickets`, `/compact` at the nearest phase boundary and carry on.

## On-ramps

A starting situation that generates work, then merges onto the main flow.

- **Bugs and requests piling up** → **`/triage`**. Moves issues through triage roles and produces agent-ready issues that **`/implement`** later picks up. Triage is for issues **you didn't create** — bug reports, incoming requests, anything arriving raw. Tickets from `/to-tickets` are already agent-ready; send those straight to `/implement`.

- **Something's broken** → **`/diagnosing-bugs`**. For the hard ones: the bug that resists a first glance, the intermittent flake, the regression between two known-good states. It refuses to theorise until it has a **tight feedback loop** — one command that already goes red on *this* bug — then fixes with a regression test. Its post-mortem hands off to **`/improve-codebase-architecture`** when the real finding is that there's no good seam to lock the bug down.

- **A huge, foggy effort, too big for one session** → **`/wayfinder`**, the most cognitively demanding flow here. When the way to the destination isn't visible yet, it charts a **shared map** of **decision tickets** and resolves them one at a time — producing **decisions, not deliverables** — until the way is clear. Where `/grill-with-docs` sharpens an idea you can hold in one session, wayfinder is for the idea you can't. Save it for exactly that.

  When the map clears, **it hands off, it doesn't build**: merge onto the main flow at **`/to-spec`**, which collapses the map's linked decisions into a buildable plan, then `/to-tickets` and `/implement`. Go straight to `/implement` only when the effort turned out genuinely small — looping the map into it otherwise throws the linked detail away.

## Codebase health

- **`/improve-codebase-architecture`** — run in a spare moment to keep the codebase good for agents to operate in. It surfaces **deepening opportunities**; picking one _generates an idea_ for the main flow at `/grill-with-docs`. It's the survey that finds candidates; `/codebase-design` is the bench you design the chosen one on.

## Vocabulary underneath

Two model-invoked references running *beneath* the other skills, each the single source of truth for its vocabulary. Reach for them when the **words**, not the process, are the problem.

- **`/domain-modeling`** — the project's *domain* language: challenge a fuzzy term, resolve an overloaded word ("account" doing three jobs), record a hard-to-reverse decision as an ADR. The discipline `/grill-with-docs` drives to keep `CONTEXT.md` a clean glossary.
- **`/codebase-design`** — the deep-module vocabulary (module, interface, depth, seam, adapter, leverage, locality) for designing a module's *shape*. `/tdd` and `/improve-codebase-architecture` both speak it.

## Phase boundaries

A **phase** is a chunk of work inside a session — the grilling, the implementation, the QA. At the **boundary** between two, you have five options, and picking between them is the fuzziest decision in this map:

- **Continue** — stay put. Costs nothing, loses nothing.
- **`/clear`** — empty the window, when nothing here matters to what's next.
- **`/handoff`** — write a portable markdown file. Narrow: a **new harness**, a **new directory**, a **colleague**, or forking a side task **mid-phase**. What it buys is portability.
- **Subagent** — send a tightly-scoped task to its own window and get a report back.
- **`/compact`** — compress this context and seed a fresh session with it. The **default**, at the bottom of the tree rather than the first reach.

Read [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md) for the ordered tree — the five questions, the reasoning behind each branch, and why the primary-source cost makes **Continue** the one to rule out first. Make the decision **at** a boundary; mid-phase, continue or split the rest into subagents.

## Standalone

Off the main flow. Each line carries what its description omits — reach for the roster's description for the rest.

- **`/grill-me`** — the same interview as `/grill-with-docs` but **stateless**. For when there is no repo under the work. In a working directory, `/grill-with-docs` is strictly better.
- **`/grilling`** — the interview primitive: rounds, the frontier, facts are the agent's job and decisions are yours. `/triage`, `/wayfinder` and `/improve-codebase-architecture` all run it internally. Reach for it directly to get the interview with no wrapper.
- **`/prototype`** — throwaway is a constraint on how the code is written, not a promise to destroy it: the answer folds into the real code, and the prototype is kept as a **primary source** on a `prototype/<name>` branch off main, pointed at from the implementation issue.
- **`/research`** — the cited file it leaves is material to take *into* `/grill-with-docs`. Research feeds the thinking; it doesn't replace it.
- **`/to-questionnaire`** — the inverse of `/grill-me`: it interviews you about the **send** — who it's going to, what you need back — and aims the questions at the gap. What returns is material for `/grill-with-docs` or `/to-spec`.
- **`/wizard`** — for steps only a **human** can take. Model-invoked, so the agent reaches for it on hitting a wall only you can pass. Where the agent could do it itself, it should.
- **`/wait-what`** — the corrective for a message that didn't land, usable mid-conversation inside any other skill. It works after the fact; `/grill-with-docs` is the upfront cure, since a shared language agreed early stops the jargon arriving.
- **`/resolving-merge-conflicts`** — resolves by **intent** traced to each side's primary source rather than by picking lines, then finishes the operation. It never runs `--abort`.
- **`/writing-for-agents`** — the reference for writing skills, `AGENTS.md`, and pointed-at docs. Consult it whenever you are editing any of them, including the skills in this map.

## Precondition

**`/setup-matt-pocock-skills`** — run before your first engineering flow to configure the issue tracker, triage labels, and doc layout the other skills assume. Custom issue trackers also work.

---

# Beyond the map

The map above covers one family of skills. The roster from step 1 is wider, and everything in it is equally recommendable. Expect at least these to sit outside the map:

- **Personal skills kept alongside them** — sharpened review, coding-behaviour guidelines, extra interview variants, handoff variants.
- **Environment and plugin skills** — document formats, data visualisation, harness configuration, API references. These arrive with the session rather than this repo, so this map never names them, and they are frequently the right answer.

Read them off the roster, and match on their descriptions the same way. When the best answer for the situation is one of these, give it: a good recommendation from outside the map beats a mediocre one from inside it.
