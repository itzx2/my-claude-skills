---
name: setup-roblox-standards
description: Write this repo's Roblox coding standards from the Roblox domain skills, agreed with you, and route every agent and code review to them.
disable-model-invocation: true
---

# Setup Roblox Standards

Turn the Roblox domain skills into **this repo's own** standards: four marked sections in its standards document, built from what the repo already does and what the user decides, and routed so every agent reads them and `code-review` enforces them.

The standards are the repo's, never this skill's. No package, framework or style is assumed: every specific comes from the survey or from the user.

## Reference

### Sections

| Section | Marker name | Domain skills | Template |
|---|---|---|---|
| Architecture | `architecture` | `roblox-architecture`, `roblox-luau-patterns` (cleanup, lifecycle) | [templates/architecture.md](templates/architecture.md) |
| Trust boundary | `trust-boundary` | `roblox-networking`, `roblox-security` | [templates/trust-boundary.md](templates/trust-boundary.md) |
| Player data | `player-data` | `roblox-data`, `roblox-server-data` (shared, cross-server state) | [templates/player-data.md](templates/player-data.md) |
| Luau style | `luau-style` | `roblox-luau-core`, `roblox-luau-types` | [templates/luau-style.md](templates/luau-style.md) |

All skills are in the `my-roblox-skills` plugin; load them by their `my-roblox-skills:` invocation. Name them; never copy their text into the standards. The standards hold only what a reviewer can check in a diff: performance, gameplay, design and UI stay out.

### House practice and guidance

**House practice** is what the repo's own code already does, with a path for every claim. **Guidance** is what the domain skills teach. When they disagree:

- **House practice wins on shape**: frameworks, layering, module and OOP style, packages, naming.
- **Guidance wins on trust, authority, data loss and cleanup defects.** Every such clash becomes a grill question with the guidance as the recommendation. Codifying a house habit that opens a hole is the failure this skill exists to prevent.

Rules cover new and changed code. This skill audits nothing repo-wide.

### Rule shape

Each rule is one bullet in its template's format:

- a positive statement naming at least one real path in this repo;
- **Why**: one line tied to a Roblox runtime or trust fact;
- **Check**: what a reviewer holding only the diff looks for;
- a kind: **hard** (a break blocks the change), **judgement** (a break is an argument), or **mechanical** (a tool could catch it).

About fifteen rules per section at most. Past that, keep the rules whose breaks cost the most.

### Markers

Sections sit between `<!-- my-roblox-skills:<section>:start -->` and `<!-- my-roblox-skills:<section>:end -->`. The router pointer sits between `<!-- my-roblox-skills:standards:start -->` and `<!-- my-roblox-skills:standards:end -->`. Other tools rely on these exact strings.

A rerun replaces only the text between a pair, and appends a section whose pair is missing. Everything outside the markers stays byte-for-byte as it was.

### The standards document

- The repo already keeps coding standards under another name (any doc whose job is how code here is written): write the sections into that doc, and create `CODING_STANDARDS.md` at the repo root holding one line that points to it. `code-review` is guaranteed to read `CODING_STANDARDS.md`; the pointer leads it to the real doc in one read.
- The user asks to standardise the name: move that doc to `CODING_STANDARDS.md` instead.
- No standards doc exists: create `CODING_STANDARDS.md`.

Creating or moving any root file needs the user's approval in step 3.

## Steps

### 1. Load

Load `my-roblox-skills:roblox-collaboration-mode`. When `my-claude-skills` is installed, also load `my-claude-skills:writing-for-agents`: the standards are a document agents read, and its rules on pointers, positive wording and pruning apply to every line you write.

Find the repo root (the directory holding `.git`) and record whether `my-claude-skills` is installed: its skills appear in your Skill listing as `my-claude-skills:*`.

*Done when* collaboration mode is loaded, and you know the repo root and whether `my-claude-skills` is present.

### 2. Survey

Dispatch **one subagent per section, in parallel**. Give each the brief in [SURVEY.md](SURVEY.md), with its section name, its domain skills from the Sections table, the absolute path of its template, and the repo root. A subagent writes nothing; its report is its only output.

While they run, find the repo's existing standards doc, decision-records folder, `AGENTS.md`, every `CLAUDE.md` from the repo root upward, and whether it uses Selene (`selene.toml`).

*Done when* all four reports are in, each fact in them carries a path, every Studio-only location is either checked or listed as a survey gap, and you know which standards, router and Selene files exist.

### 3. Grill

Merge the reports and put the open decisions to the user. With `my-claude-skills` installed, invoke `my-claude-skills:grilling` over them. Otherwise ask everything in **one numbered round**, each question carrying a recommendation.

Cover, each question with a recommendation:

- each house practice: adopt it as a rule, or leave it out;
- each clash between house practice and guidance, settled by the policy above;
- the user's own house rules (required packages, OOP style, naming) that the survey could not infer;
- each survey gap, especially an unchecked Studio-only location in player data;
- mechanical rules: with Selene, the proposed `selene.toml` change or standard-library definition (marking APIs deprecated or removed, or setting lint levels); without it, kept as prose marked *mechanical*;
- the standards document: which doc, and every root file to create or move;
- the router: the `AGENTS.md` to create, if none exists, and the `@AGENTS.md` import for a `CLAUDE.md` that lacks it.

Offer an ADR only for a decision that is hard to reverse, surprising without context, and a real trade-off, and only when the repo already keeps decision records, in its folder, numbering and format. Write nothing to any glossary.

*Done when* every rule in every draft is adopted, changed or dropped by the user's answer, every clash is settled by the user, and every file this run will create, move or change is approved.

### 4. Write the sections

For each section, read its template, fill it from the agreed rules, and write it into the standards document between its markers: replace the pair's contents when present, append the section when absent. Keep the template's attribution line. Create `CODING_STANDARDS.md`, its pointer, or the move as approved, and apply approved Selene changes.

*Done when* the standards document holds four marked sections, each rule follows the rule shape, no template placeholder remains, and the text outside the markers is unchanged.

### 5. Route

In `AGENTS.md`, put this line between the router-pointer markers, in its rules section when it has one, once:

> **Before writing, moving or reviewing Luau**, read the Roblox standards in `<standards document, repo-relative>`.

When the repo has no `AGENTS.md` and the user approved one, create it holding a one-line description of the project and the pointer, and suggest `/my-claude-skills:project-brain` for a full router. When a `CLAUDE.md` in the repo lacks an `@AGENTS.md` import and the user approved it, add the import on its own line: Claude Code reads `AGENTS.md` only when no `CLAUDE.md` exists, so a sentence telling Claude to read it loads nothing.

*Done when* `AGENTS.md` holds the pointer exactly once, and every approved import is in place.

### 6. Verify and report

Check by running, not by reading:

- every path named in the standards resolves from the repo root;
- every marker pair appears once and in order, in the standards document and in `AGENTS.md`;
- the Roblox briefing points at the standards: run `node <plugin root>/hooks/roblox-briefing.js` with `{"hook_event_name":"SubagentStart","cwd":"<repo root>"}` on stdin, where the plugin root is two levels above this skill's base directory, and find the line naming `CODING_STANDARDS.md`.

Then report in one message: the files written, created or moved; each section's rule count by kind; each clash and how it was settled; the survey gaps left open; and what `code-review` will now enforce.

*Done when* all three checks pass, or the report names the one that failed and why.
