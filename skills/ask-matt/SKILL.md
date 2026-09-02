---
name: ask-matt
description: Ask which skill or flow fits your situation. A router over every skill installed in this session.
disable-model-invocation: true
---

# Ask Matt

You don't remember every skill, so ask.

This routes over **every skill installed in this session** — the engineering skills mapped below, the personal ones beside them, and whatever the environment or a plugin brought along.

## 1. Build the roster

Answer from what is actually installed right now, never from memory of what this repo used to hold. Read both sources — each holds skills the other omits:

- **Your Skill tool listing** — every model-invocable skill, with full descriptions. Covers plugin skills, environment skills, and anything the harness supplies. It is the *only* source for skills that arrive from outside this machine's plugin directory, such as claude.ai-managed plugins.
- **The SessionStart briefing** — the `Skills installed in this session` block emitted by this plugin's hook. It enumerates every enabled local plugin plus loose skills in `~/.claude/skills`, and its **user-invoked section is the only place skills with `disable-model-invocation: true` appear at all**. Without it, more than a third of the map below is invisible to you.

If the briefing is missing from context, say so rather than guessing — the roster is incomplete without it, and `claude plugin details <name>` will list a plugin's components on demand as a fallback.

That is the roster. It supersedes every name below: a skill in the roster is available even when this map omits it, and a name here that the roster lacks is gone.

### Invocation names are namespaced

Claude Code namespaces plugin-provided skills as **`plugin:skill`** and leaves loose personal skills bare. Everything in the map below ships in the **`my-claude-skills`** plugin, so nothing here is invoked by its bare name: a bare `/to-spec` no longer resolves.

The map writes each skill the way you will reach it:

- **`/my-claude-skills:<name>`** — user-invoked. Only the human can start it, so the map shows the full string to type.
- **`<name>`** — model-invocable. Written short for readability; you call it through `Skill` as `my-claude-skills:<name>`, and its full description is already in your Skill listing.

`/clear` and `/compact` are Claude Code built-ins and stay bare. Where the two forms disagree, the roster wins — take the exact string from there rather than reconstructing it.

## 2. Match the situation against the whole roster

Weigh **every** entry in the roster against what the user described. The map below carries relationships no description states — which skill precedes which, and which of two overlapping skills wins — so use it for the skills it covers, and match the rest on their descriptions alone.

The completion criterion is coverage: **every roster entry considered**. A skill from outside this map is as good an answer as one inside it — recommend by fit, and say plainly when the best fit is a skill this map never mentions.

## 3. Recommend

Name the exact invocation, say in one sentence what it buys, and give the order when several chain. Recommend every skill that fits, and say when nothing does.

---

# The map

Most paths run along one **main flow**, with two **on-ramps** merging onto it. Everything else is standalone, or a vocabulary layer running underneath.

## The main flow: idea → ship

1. **`/my-claude-skills:grill-with-docs`** — sharpen the idea by interview. Start here whenever you are **working in a working directory**: it's stateful, retaining what it learns in `CONTEXT.md` and ADRs. Outside a working directory use `/my-claude-skills:grill-me`. Both run the same `grilling` primitive; `grill-with-docs` leaves the paper trail, so it wins wherever a repo exists to leave it in.
2. **Branch — can you settle every question in conversation?** If a question needs a runnable answer (state, business logic, a UI you have to see), detour through a prototype, bridged by **`/my-claude-skills:handoff`** in both directions:
   - **`/my-claude-skills:handoff`** out, then open a fresh session against that file,
   - **`/my-claude-skills:prototype`** to answer the question with throwaway code,
   - **`/my-claude-skills:handoff`** back what you learned, and reference it from the original idea thread.
3. **Branch — is this a multi-session build?**
   - **Yes** → **`/my-claude-skills:to-spec`** (turn the thread into a spec), then **`/my-claude-skills:to-tickets`** to split it into tracer-bullet tickets, each declaring its **blocking edges**. On a local tracker that's one file per ticket under `.scratch/<feature>/issues/`, worked blockers-first by hand; on a real tracker the edges become native blocking links, so any ticket whose blockers are done can be grabbed — kick off **`/my-claude-skills:implement`** per ticket, **`/clear`ing context between each one**. Each ticket is self-contained, so the last one's context is disposable.
   - **No** → **`/my-claude-skills:implement`** right here, in the same context window.

   Either way, **`/my-claude-skills:implement`** drives **`/my-claude-skills:tdd`** internally — one red-green slice at a time — then closes out by running **`/my-claude-skills:code-review`** before committing. Reach for **`/my-claude-skills:tdd`** alone to build a concrete behaviour test-first without a full spec, and **`/my-claude-skills:code-review`** alone to review a branch or PR against a fixed point.

4. **The branch lifecycle brackets that step.** **`using-git-worktrees`** opens it — an isolated workspace on a green baseline, so the checkout you were sitting in keeps its state and every later red test is attributable. **`finishing-a-development-branch`** closes it, and is where the chain used to just stop: it verifies the suite on the tree about to be integrated, then puts merge / PR / keep to you and executes the answer, cleaning up only the workspace the first one created. Both fire from `/my-claude-skills:implement`, so on the main flow you get them without asking; reach for `finishing-a-development-branch` by hand when a branch has been sitting finished for a while.

### Context hygiene

Keep steps 1–3 in **one unbroken context window** — compact or clear only after `/my-claude-skills:to-tickets` — so the grilling, spec, and tickets all build on the same thinking. Each `/my-claude-skills:implement` then starts fresh from the ticket.

The limit is the **[smart zone](https://www.aihero.dev/ai-coding-dictionary/smart-zone)**: the window (~150k tokens on state-of-the-art models) within which the model still reasons sharply. If a session approaches it before `/my-claude-skills:to-tickets`, `/compact` at the nearest phase boundary and carry on.

## On-ramps

A starting situation that generates work, then merges onto the main flow.

- **Bugs and requests piling up** → **`/my-claude-skills:triage`**. Moves issues through triage roles and produces agent-ready issues that **`/my-claude-skills:implement`** later picks up. Triage is for issues **you didn't create** — bug reports, incoming requests, anything arriving raw. Tickets from `/my-claude-skills:to-tickets` are already agent-ready; send those straight to `/my-claude-skills:implement`.

- **Something's broken** → **`/my-claude-skills:diagnosing-bugs`**. For the hard ones: the bug that resists a first glance, the intermittent flake, the regression between two known-good states. It refuses to theorise until it has a **tight feedback loop** — one command that already goes red on *this* bug — then fixes with a regression test. Its post-mortem hands off to **`/my-claude-skills:improve-codebase-architecture`** when the real finding is that there's no good seam to lock the bug down.

- **A huge, foggy effort, too big for one session** → **`/my-claude-skills:wayfinder`**, the most cognitively demanding flow here. When the way to the destination isn't visible yet, it charts a **shared map** of **decision tickets** and resolves them one at a time — producing **decisions, not deliverables** — until the way is clear. Where `/my-claude-skills:grill-with-docs` sharpens an idea you can hold in one session, wayfinder is for the idea you can't. Save it for exactly that.

  When the map clears, **it hands off, it doesn't build**: merge onto the main flow at **`/my-claude-skills:to-spec`**, which collapses the map's linked decisions into a buildable plan, then `/my-claude-skills:to-tickets` and `/my-claude-skills:implement`. Go straight to `/my-claude-skills:implement` only when the effort turned out genuinely small — looping the map into it otherwise throws the linked detail away.

## Codebase health

- **`/my-claude-skills:improve-codebase-architecture`** — run in a spare moment to keep the codebase good for agents to operate in. It surfaces **deepening opportunities**; picking one _generates an idea_ for the main flow at `/my-claude-skills:grill-with-docs`. It's the survey that finds candidates; `codebase-design` is the bench you design the chosen one on.

## Interface craft

Eight vendored skills covering animation and interface design. Their descriptions route between them unusually well, so match on those — what follows is only what the descriptions leave out.

- **Four do the work, split by verb.** **`animate`** writes new motion; **`/my-claude-skills:review-animations`** judges motion in a diff; **`improve-animations`** audits a whole repo and emits plans; **`find-animation-opportunities`** finds what is *missing*, and is required to report what it deliberately rejected — that rejection list is the reason to reach for it over a general "make this nicer". When two seem to fit, the verb decides.
- **They chain onto the main flow at the same joints the engineering skills do.** `find-animation-opportunities` → `improve-animations plan <suggestion>` turns one row into a self-contained plan; `improve-animations` writes plans into `plans/` for **`/my-claude-skills:implement`** to execute. `animate` then `/my-claude-skills:review-animations` is the write-then-check pair, the same shape as `/my-claude-skills:implement` closing with `/my-claude-skills:code-review`.
- **`emil-design-eng`** is the superset the other four were carved out of, and its description carries no trigger — so it fires as a catch-all or not at all. Prefer whichever of the four matches the verb; reach for it only when the question is philosophy rather than a task.
- **`apple-design`** and **`animation-vocabulary`** are references, not flows. The first for gesture physics, springs, momentum, materials, and typography; the second to put a name to an effect ("that iOS pull-and-snap" → *rubber-banding*) before asking anyone to build it. Both sit underneath the four the way `codebase-design` sits under `tdd`.
- **`pick-ui-library`** is the dependency question, not the motion one — a curated list of trusted picks by task. `animate` hands off to it the moment a request turns out to need a *component* (a toast, a drawer, a command menu) rather than an animation, so it fires mid-flow rather than being asked for. Reach for it directly before adding any frontend dependency.
- **Where they contradict each other, say so instead of picking silently.** `apple-design` defaults springs to no bounce and reserves bounce for gestures that carried momentum; the other four give `bounce: 0.2` as the default. See the README's *Vendored skills* section for the rest.

## Vocabulary underneath

Two model-invoked references running *beneath* the other skills, each the single source of truth for its vocabulary. Reach for them when the **words**, not the process, are the problem.

- **`domain-modeling`** — the project's *domain* language: challenge a fuzzy term, resolve an overloaded word ("account" doing three jobs), record a hard-to-reverse decision as an ADR. The discipline `/my-claude-skills:grill-with-docs` drives to keep `CONTEXT.md` a clean glossary.
- **`codebase-design`** — the deep-module vocabulary (module, interface, depth, seam, adapter, leverage, locality) for designing a module's *shape*. `tdd` and `/my-claude-skills:improve-codebase-architecture` both speak it.

## Phase boundaries

A **phase** is a chunk of work inside a session — the grilling, the implementation, the QA. At the **boundary** between two, you have five options, and picking between them is the fuzziest decision in this map:

- **Continue** — stay put. Costs nothing, loses nothing.
- **`/clear`** — empty the window, when nothing here matters to what's next.
- **`/my-claude-skills:handoff`** — write a portable markdown file. Narrow: a **new harness**, a **new directory**, a **colleague**, or forking a side task **mid-phase**. What it buys is portability. It fills a fixed template and is done only when a fresh agent could take the next action from the file alone.
- **`/my-claude-skills:claude-handoff`** — the same compaction, but it *launches* rather than saves: the summary becomes a background agent's prompt via `claude --bg`, running immediately in the current directory. Pick it over `handoff` when the next session should start now and unattended; pick `handoff` when a human, another harness, or a later you will pick the work up.
- **Subagent** — send a tightly-scoped task to its own window and get a report back.
- **`/compact`** — compress this context and seed a fresh session with it. The **default**, at the bottom of the tree rather than the first reach.

Read [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md) for the ordered tree — the five questions, the reasoning behind each branch, and why the primary-source cost makes **Continue** the one to rule out first. Make the decision **at** a boundary; mid-phase, continue or split the rest into subagents.

## Standalone

Off the main flow. Each line carries what its description omits — reach for the roster's description for the rest.

- **`/my-claude-skills:grill-me`** — the same interview as `/my-claude-skills:grill-with-docs` but **stateless**. For when there is no repo under the work. In a working directory, `grill-with-docs` is strictly better.
- **`/my-claude-skills:batch-grill-me`** — `grill-me` with the rounds collapsed: every frontier question at once, round by round, instead of one narrow frontier at a time. Reach for it when you already hold the whole design in your head and want the interrogation over in one pass; the round-by-round version is better when each answer genuinely reshapes the next question.
- **`/my-claude-skills:loop-me`** — grilling aimed specifically at the **specs for workflows you want to build**, inside this workspace. Where `grill-with-docs` sharpens one idea, this one is for repeatedly turning "I want a thing that does X" into a spec you can hand to `/my-claude-skills:to-spec`.
- **`grilling`** — the interview primitive: rounds, the frontier, facts are the agent's job and decisions are yours. `/my-claude-skills:triage`, `/my-claude-skills:wayfinder` and `/my-claude-skills:improve-codebase-architecture` all run it internally. Reach for it directly to get the interview with no wrapper.
- **`prototype`** — throwaway is a constraint on how the code is written, not a promise to destroy it: the answer folds into the real code, and the prototype is kept as a **primary source** on a `prototype/<name>` branch off main, pointed at from the implementation issue.
- **`research`** — the cited file it leaves is material to take *into* `/my-claude-skills:grill-with-docs`. Research feeds the thinking; it doesn't replace it.
- **`/my-claude-skills:to-questionnaire`** — the inverse of `/my-claude-skills:grill-me`: it interviews you about the **send** — who it's going to, what you need back — and aims the questions at the gap. What returns is material for `/my-claude-skills:grill-with-docs` or `/my-claude-skills:to-spec`.
- **`wizard`** — for steps only a **human** can take. The agent reaches for it on hitting a wall only you can pass; where it could do the step itself, it should.
- **`/my-claude-skills:wait-what`** — the corrective for a message that didn't land, usable mid-conversation inside any other skill. It works after the fact; `/my-claude-skills:grill-with-docs` is the upfront cure, since a shared language agreed early stops the jargon arriving.
- **`scrutinize`** — the outsider read on a plan, PR, or change: it questions the *intent* first — would something simpler reach the same goal — then traces the real code path rather than the diff to check the change does what it claims. `code-review` asks "does this match our standards and the spec?"; scrutinize asks "should this exist in this shape at all?" Reach for both on anything hard to reverse.
- **`karpathy-guidelines`** — the behavioural floor for writing code: surgical changes, surfaced assumptions, verifiable success criteria, no overcomplication. It runs *underneath* `tdd` and `/my-claude-skills:implement` rather than instead of them, and is worth naming explicitly when a session has been sprawling.
- **`/my-claude-skills:teach`** — for when the goal is *you* understanding something, not the repo changing. Use it when you would otherwise accept a working diff you could not defend.
- **`resolving-merge-conflicts`** — resolves by **intent** traced to each side's primary source rather than by picking lines, then finishes the operation. It never runs `--abort`.
- **`/my-claude-skills:project-brain`** — writes the `AGENTS.md` router over a project and scaffolds the four layers beneath it: navigation, vocabulary, decisions, state. On a new project it runs **after** `/my-claude-skills:grill-with-docs`, never before — it routes to `CONTEXT.md` and the ADRs, so those have to exist for it to point at. It then writes standing rules into the router that keep the layers current through ordinary work, so re-run it only when the repo's *shape* changes: a new top-level directory, a layer moving home. Where `writing-for-agents` is the reference for how such a file should read, this is the procedure that produces one.
- **`writing-for-agents`** — the reference for writing skills, `AGENTS.md`, and pointed-at docs. Consult it whenever you are editing any of them, including the skills in this map.

## Precondition

**`/my-claude-skills:setup-matt-pocock-skills`** — run before your first engineering flow to configure the issue tracker, triage labels, and doc layout the other skills assume. Custom issue trackers also work.

---

# Beyond the map

The map above covers one family of skills. The roster from step 1 is wider, and everything in it is equally recommendable. Expect at least these to sit outside the map:

- **Other local plugins** — whatever else is installed alongside this one. They appear in both roster sources, prefixed with their own plugin name.
- **Environment and claude.ai-managed skills** — document formats, data visualisation, harness configuration, API references. These arrive with the session rather than from this machine's plugin directory, so the SessionStart briefing never sees them and **only your Skill tool listing does**. They are frequently the right answer.
- **Loose personal skills** — anything sitting directly in `~/.claude/skills`, invoked bare with no plugin prefix.

Read them off the roster, and match on their descriptions the same way. When the best answer for the situation is one of these, give it: a good recommendation from outside the map beats a mediocre one from inside it.
