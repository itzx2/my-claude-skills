---
name: ask-roblox
description: Ask which Roblox skill or combination fits your situation. A router over the 29 Roblox domain skills in this plugin.
disable-model-invocation: true
---

# Ask Roblox

You don't remember every Roblox skill, so ask.

This routes over the **29 Roblox domain skills** in the `my-roblox-skills` plugin. The map below carries what their descriptions leave out: which skill to load first, which of two overlapping skills owns a question, and which combinations a common problem needs.

## 1. Build the roster

Answer from what is installed right now, never from memory of what this plugin used to hold.

- **Your Skill tool listing** has every Roblox domain skill with its full description. All 29 are model-invocable.
- **The `Roblox skills` briefing**, emitted at session start and at every subagent start by this plugin's hook, says whether this folder looks like a Roblox project and why.

A skill in the listing is available even when this map omits it, and a name here that the listing lacks is gone. Invocation names are namespaced: every skill below is called through `Skill` as `my-roblox-skills:<name>`. The map writes them that way.

## 2. Match the situation

1. **Start with `my-roblox-skills:roblox-collaboration-mode`.** Its own entry point asks to be loaded first for any Roblox task. It calibrates initiative and evidence; the domain skills supply the technical knowledge.
2. **Match the requested outcome and the failure symptoms against all four groups below.** A request often needs several domains. Pick the relevant ones instead of loading the whole library.
3. **Pair with the engineering flow when it is installed.** These skills do not replace specification, TDD, debugging, code review, or handoff workflows. With `my-claude-skills` installed, `/my-claude-skills:ask-matt` routes those; recommend both where the work needs both, such as `my-claude-skills:diagnosing-bugs` driven by `roblox-data` knowledge.
4. **State capability limits.** Studio work needs a connected Studio MCP bridge; cloud operations need suitable access. Repository reasoning can continue without a live Studio. An external library a skill mentions is an option to weigh against the project, not something this plugin installs.

## 3. Recommend

Name each exact invocation, say in one sentence what it contributes, and give the order when several chain. Say plainly when nothing fits.

Before stating what a skill does or recommending that one of its steps be skipped, read that skill's `SKILL.md`, and its `references/full.md` when the task needs the depth: the summaries here are for orientation only.

---

# The map

## Core: language, ownership, authority and state

| Skill | Reach for it when |
| --- | --- |
| [my-roblox-skills:roblox-collaboration-mode](../roblox-collaboration-mode/SKILL.md) | Starting any Roblox task; calibrating collaboration, initiative, uncertainty and evidence. |
| [my-roblox-skills:roblox-luau-core](../roblox-luau-core/SKILL.md) | Luau syntax, tables, scope, control flow, string patterns, or bugs caused by carrying over another language's assumptions. |
| [my-roblox-skills:roblox-luau-types](../roblox-luau-types/SKILL.md) | Type errors, narrowing, generics, exported types, strict checking, or solver-dependent syntax. |
| [my-roblox-skills:roblox-luau-patterns](../roblox-luau-patterns/SKILL.md) | Module/object shape, scheduling, signals, fallible calls, resource ownership and cleanup. |
| [my-roblox-skills:roblox-architecture](../roblox-architecture/SKILL.md) | Existing owners, module boundaries, runtime placement, dependency direction, startup, or client/server responsibilities. |
| [my-roblox-skills:roblox-networking](../roblox-networking/SKILL.md) | Designing or fixing remote contracts, replication, payload validation, rate limits or server authority. |
| [my-roblox-skills:roblox-security](../roblox-security/SKILL.md) | Auditing exploit paths, authorization, movement, purchases, economy or untrusted data. |
| [my-roblox-skills:roblox-data](../roblox-data/SKILL.md) | Player saves, profile ownership, load/save failures, schemas, migrations, shutdown and durable transactions. |
| [my-roblox-skills:roblox-server-data](../roblox-server-data/SKILL.md) | Shared/world state, leaderboards, MessagingService, MemoryStore, matchmaking or cross-server coordination. |
| [my-roblox-skills:roblox-performance](../roblox-performance/SKILL.md) | Low frame rate, server spikes, memory growth, network cost, streaming or device-specific regressions. |

**Overlaps:** architecture identifies ownership; patterns shape an owned module. Networking designs the boundary; security challenges it. Data owns durable player state; server-data covers shared and cross-server systems. Performance starts from a measured scenario rather than choosing optimizations from the symptom alone.

## Gameplay: what players see and control

| Skill | Reach for it when |
| --- | --- |
| [my-roblox-skills:roblox-building](../roblox-building/SKILL.md) | Maps, geometry, props, model placement, asset selection or generated scenery. |
| [my-roblox-skills:roblox-physics](../roblox-physics/SKILL.md) | Constraints, vehicles, projectiles, raycasts, ragdolls, moving platforms or network ownership. |
| [my-roblox-skills:roblox-npc-ai](../roblox-npc-ai/SKILL.md) | NPC detection, pathfinding, state machines, spawning, navigation or population management. |
| [my-roblox-skills:roblox-camera](../roblox-camera/SKILL.md) | Camera controllers, cutscenes, spectating, screen/world projection or camera restoration. |
| [my-roblox-skills:roblox-input](../roblox-input/SKILL.md) | Keyboard, mouse, touch, gamepad, action binding, focus, cancellation or hybrid input. |
| [my-roblox-skills:roblox-gui](../roblox-gui/SKILL.md) | HUDs, shops, menus, screen/world UI, layout, safe insets, state, responsiveness or focus navigation. |
| [my-roblox-skills:roblox-animation-vfx](../roblox-animation-vfx/SKILL.md) | Animation tracks/markers, particles, trails, beams, tweens and feedback effects. |
| [my-roblox-skills:roblox-lighting](../roblox-lighting/SKILL.md) | Lighting, atmosphere, post-processing, day/night cycles or scene readability. |
| [my-roblox-skills:roblox-audio](../roblox-audio/SKILL.md) | Sound cues, music, spatial audio, mixing, playback failures or sound cleanup. |
| [my-roblox-skills:roblox-localization](../roblox-localization/SKILL.md) | Translation tables, locale handling, fallback strings, translated layouts or localization testing. |

**Overlaps:** GUI owns presentation and state; input owns actions and device paths. Camera and animation/VFX overlap on screen feedback, but camera ownership belongs with the controller. Building owns geometry and assets; lighting owns illumination. Web animation skills elsewhere (such as `my-claude-skills:animate`) do not supply Roblox APIs; use the Roblox presentation skills for engine behavior.

## Design: game structure, player evidence and purchases

| Skill | Reach for it when |
| --- | --- |
| [my-roblox-skills:roblox-game-design](../roblox-game-design/SKILL.md) | Core loops, onboarding, levels, progression, economy sources/sinks or game feel. |
| [my-roblox-skills:roblox-player-psychology](../roblox-player-psychology/SKILL.md) | Player motivation, reward schedules, goals, streaks, pricing perception, RNG/pity or community loops. |
| [my-roblox-skills:roblox-growth-design](../roblox-growth-design/SKILL.md) | Discovery, acquisition, retention diagnosis, thumbnails, experiments, positioning or LiveOps. |
| [my-roblox-skills:roblox-analytics](../roblox-analytics/SKILL.md) | Event taxonomy, economy events, funnels, onboarding traces, instrumentation or interpreting measured outcomes. |
| [my-roblox-skills:roblox-monetization](../roblox-monetization/SKILL.md) | Passes, developer products, receipts, entitlements, subscriptions, pricing APIs or purchase-policy implementation. |

**Overlaps:** game-design asks how the experience works; psychology asks how players may perceive its mechanics. Growth diagnoses outcomes and experiments; analytics establishes what the measurements mean. Monetization owns purchase implementation and pairs with data and security for durable, authorized grants. Keep design hypotheses apart from observed behavior and current platform rules.

## Tools: operate, integrate and release

| Skill | Reach for it when |
| --- | --- |
| [my-roblox-skills:roblox-studio-mcp](../roblox-studio-mcp/SKILL.md) | Inspecting or changing Studio, selecting place/context, asset operations, runtime logs, screenshots or playtests. |
| [my-roblox-skills:roblox-tooling](../roblox-tooling/SKILL.md) | Rojo/sync ownership, package managers, tool pins, lint/format/type tooling, standalone tests, builds or CI. |
| [my-roblox-skills:roblox-cloud](../roblox-cloud/SKILL.md) | Open Cloud, API keys, OAuth, webhooks, external data access or teleport handoffs. |
| [my-roblox-skills:roblox-publish-checklist](../roblox-publish-checklist/SKILL.md) | Pre-release readiness, exact payload and evidence, rollback, and verifying the serving build. |

**Overlaps:** tooling covers repository and build workflows; Studio MCP covers live editor and runtime operations; cloud covers external integration. Publish-checklist collects release evidence and does not itself authorize publication.

## Common combinations

- **Saves fail or progress duplicates:** architecture → data → security; add server-data for cross-server or shared state, and Studio MCP for live evidence.
- **Shop UI or purchases break:** GUI + input for presentation; monetization + data for grants; networking + security for requests crossing the trust boundary.
- **NPCs get stuck or cause lag:** NPC AI + physics; performance for measurement; Studio MCP for the actual navigation or population scenario.
- **Onboarding or retention needs investigation:** game-design + analytics → growth-design; psychology supplies hypotheses, not substitute metrics.
- **Preparing a release:** publish-checklist plus the domains changed; tooling for build/source parity, and Studio MCP for live verification where supported.
- **A new feature from scratch:** collaboration-mode → architecture for placement → the gameplay or design domains it touches → networking + security for anything the client sends.

---

Credit: the routes and overlaps above are adapted from the domain structure of [TabooHarmony/roblox-brain](https://github.com/TabooHarmony/roblox-brain) (MIT), the source of every domain skill here. See this plugin's README.
