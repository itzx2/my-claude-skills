# my-roblox-skills

Roblox game development skills for Claude Code: 29 domain skills, a router
that picks between them, and a briefing that points every agent at them.

The 29 domain skills are the work of **[TabooHarmony](https://github.com/TabooHarmony)**,
copied unchanged from [roblox-brain](https://github.com/TabooHarmony/roblox-brain)
v2.3.1. See [Credits and license](#credits-and-license).

## Install

It lives in the `my-claude-skills` marketplace:

```sh
claude plugin marketplace add https://github.com/itzx2/my-claude-skills.git
claude plugin install my-roblox-skills@my-claude-skills
```

Restart Claude Code afterwards. It does not need the `my-claude-skills` plugin.
With both installed, `/my-claude-skills:ask-matt` hands Roblox questions to this
plugin's router.

Every skill is invoked through the plugin's namespace:
`my-roblox-skills:roblox-data`, `/my-roblox-skills:ask-roblox`.

## What it adds

- **`/my-roblox-skills:ask-roblox`**: a router. Describe the situation and it
  names the domain skills that fit, in order, with what each contributes. It
  carries what the skill descriptions leave out: which domain owns a question
  when two overlap, and which combinations common problems need. It is
  user-invoked, so the agent can suggest it but never starts it.
- **`/my-roblox-skills:setup-roblox-standards`**: writes this repo's own Roblox
  coding standards and routes every agent to them. It surveys the repo with one
  subagent per section, interviews you over what it found, and writes four
  sections: **architecture**, **trust boundary**, **player data** and **Luau
  style**. Each rule names a real path in your repo, says why and how a
  reviewer spots a break, and is marked *hard*, *judgement* or *mechanical*.
  The repo's practice wins on shape; the domain skills win on trust, authority,
  data-loss and cleanup defects, and every such clash is put to you.
  - **Where it writes**: into your existing standards doc, with
    `CODING_STANDARDS.md` created as a one-line pointer to it, or into a new
    `CODING_STANDARDS.md`. Root files are created only with your approval.
  - **Markers**: each section sits between
    `<!-- my-roblox-skills:<section>:start -->` and `…:end -->`. A rerun
    replaces only the text between them; everything outside stays unchanged.
  - **Wiring**: one pointer line in `AGENTS.md` (between
    `my-roblox-skills:standards` markers), an `@AGENTS.md` import in
    `CLAUDE.md` when you approve it, and the briefing below for subagents.
    `my-claude-skills:code-review` then reads the standards as the repo's
    coding standards, unchanged.

  It works alone; with `my-claude-skills` installed it interviews through
  `grilling` and writes with `writing-for-agents`. User-invoked.
- **The Roblox briefing**: a hook that runs at session start and again each
  time a subagent starts, because a subagent never sees the main session's
  start-up context. What it says depends on the folder:
  - **In a Roblox project**, the agent gets what every Roblox task needs: start
    with `roblox-collaboration-mode`, the ownership rules that settle which
    domain owns a question, a pointer to the router's `ROUTES.md` for groups and
    combinations when a task spans several domains, and the plugin's
    user-invoked skills. It points at the project's `CODING_STANDARDS.md`
    when the repo root has one, and otherwise suggests
    `setup-roblox-standards`. A subagent is also told to choose domains from
    its task when its brief names none.
  - **Anywhere else**, it gets a short pointer naming the user-invoked skills,
    because Roblox work also happens through a Studio MCP bridge with no
    repository open.

  A folder counts as a Roblox project when it or a parent up to the repository
  root holds `default.project.json` or another `*.project.json` (Rojo),
  `wally.toml`, `pesde.toml`, `rokit.toml`, `aftman.toml`, `foreman.toml`, or a
  saved place or model (`.rbxl`, `.rbxlx`, `.rbxm`, `.rbxmx`), or when `.luau`
  files sit within two levels of it. The skill count and the user-invoked
  skills come from the folders on disk, and the ownership rules are read from
  `ROUTES.md`, the one file both
  the router and the briefing use, so neither can drift from the other.
  Tested by `scripts/test-roblox-briefing.js` at the repository root.

## Skills

All 29 are model-invocable: the agent may load them itself.

**Core**: language, ownership, authority and state

- **roblox-collaboration-mode**: load first for any Roblox task. Sets initiative and which decisions need the user.
- **roblox-luau-core**: writing, editing, or debugging any Luau: tables, control flow, string patterns, scope, closures, and errors ported from JS/Python.
- **roblox-luau-types**: Luau type annotations: generics, unions, narrowing, strict mode, sealed tables, module type exports, typed metatables.
- **roblox-luau-patterns**: Luau modules, object lifecycles, signals, task scheduling, pcall, and cleanup.
- **roblox-architecture**: feature ownership, code layout, dependencies, startup, or client-server boundaries.
- **roblox-networking**: RemoteEvents and RemoteFunctions: argument validation, rate limits, server authority, exploit prevention.
- **roblox-security**: hardening against exploits: authority, remotes, economy, purchases, and DataStore flows.
- **roblox-data**: player saves: DataStore, ProfileStore, session locks, schemas, migrations.
- **roblox-server-data**: cross-server data: OrderedDataStore leaderboards, MessagingService, MemoryStore, world state, seasons.
- **roblox-performance**: low FPS, lag, memory, network load, slow phones, hot paths.

**Gameplay**: what players see and control

- **roblox-building**: geometry, maps, props, or generated assets with MCP or standalone Luau.
- **roblox-physics**: vehicles, ragdolls, projectiles, elevators, constraints, forces, network ownership.
- **roblox-npc-ai**: NPCs, bots and enemies: pathfinding, state machines, line of sight, spawns, AI update loops.
- **roblox-camera**: CFrame placement, screen raycasts, first/third-person, shoulder views, cutscenes.
- **roblox-input**: touch, gamepad, keyboard, mouse or motion input, on-screen action buttons, cross-platform action binding.
- **roblox-gui**: menus, HUDs, shops, dialogs, and UI that must work on phones, tablets, desktop and console.
- **roblox-animation-vfx**: animations, particles, beams, trails, tweens, camera shake, and other visual effects.
- **roblox-lighting**: lighting, atmosphere, day/night cycles, post-processing.
- **roblox-audio**: playback, spatial sound, music, sound effects, SoundGroups, dynamic effects.
- **roblox-localization**: localization tables, auto-translation, locale-specific content, region detection.

**Design**: game structure, player evidence and purchases

- **roblox-game-design**: core loop, tutorial/FTUE, levels, economy, retention phases, juice, grind, curation.
- **roblox-player-psychology**: first minute, rewards, streaks, daily rewards, pricing, RNG/pity, community.
- **roblox-growth-design**: diagnosing stats, discovery, retention, onboarding, experiments, LiveOps, thumbnails, packaging.
- **roblox-analytics**: AnalyticsService events, economy, funnels, onboarding traces, rate limits.
- **roblox-monetization**: GamePasses, Developer Products, subscriptions, private servers, policy checks.

**Tools**: operate, integrate and release

- **roblox-studio-mcp**: Roblox Studio through MCP: editing scripts or scenes, generating assets, playtesting, screenshots, input.
- **roblox-tooling**: Rojo, Wally, pesde, Selene, StyLua, Lune, Rokit, luau-lsp, tests, CI/CD.
- **roblox-cloud**: Open Cloud: API keys, OAuth 2.0, webhooks, scopes, token lifecycle, DataStore or messaging access from outside the game.
- **roblox-publish-checklist**: evidence-backed release gates and a pre-release audit before publishing or updating an experience.

**Dependencies:** loading the skills needs no extra packages. Live work depends
on what the host has: a Studio MCP bridge for Studio, a shell and Git for
repository work, Open Cloud access for cloud operations. Libraries a skill
mentions, such as ProfileStore or Rojo, are options to weigh, not installs this
plugin makes.

## Credits and license

**Domain skills:** every `roblox-*` folder under [`skills/`](skills) is copied
byte-for-byte from [TabooHarmony/roblox-brain](https://github.com/TabooHarmony/roblox-brain),
release v2.3.1, commit
[`ceee4aa`](https://github.com/TabooHarmony/roblox-brain/tree/ceee4aaa5004502e2a51d78b3c33bba44d84742b),
including each one's `references/full.md`. Nothing in them is changed. They
are used under the MIT License, Copyright (c) 2026 TabooHarmony; the full
license text ships with this plugin at
[`licenses/roblox-brain-LICENSE`](licenses/roblox-brain-LICENSE), as MIT
requires.

**Router, setup skill and briefing:** `ask-roblox`, `setup-roblox-standards`
and `hooks/roblox-briefing.js` are written in this repository by itzx2. The
router's four domain groups, its overlap notes and its combinations are
adapted from roblox-brain's own structure. The standards sections that
`setup-roblox-standards` writes are derived from roblox-brain's domain skills,
and each carries an attribution line saying so.

The repository's [`vendor/record.json`](../../vendor/record.json) pins the
upstream commit and marks every copied skill `verbatim`, and
`node scripts/vendor.js check` fails if any file drifts from upstream.

TabooHarmony does not endorse this plugin. Report problems with the Roblox
guidance itself
[upstream](https://github.com/TabooHarmony/roblox-brain/issues), and problems
with the packaging, router or briefing
[here](https://github.com/itzx2/my-claude-skills/issues).
