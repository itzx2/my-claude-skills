# Roblox Brain routing map

Read this map whenever `ask-matt` is handling **any Roblox-related request**:
planning, design, implementation, debugging, review, auditing, Studio work,
tooling, testing, publishing, analytics, growth, or monetization.

This is the Roblox branch of Ask Matt's map. The live roster still determines
availability and exact invocation names. All 29 bundled Brain skills are
model-invocable. Read the selected skill's entry point before recommending it;
load its deeper references when the task needs them. Select relevant domains
instead of loading the entire library for every request.

## Choose the route

1. Start with `my-claude-skills:roblox-collaboration-mode`, whose upstream
   entry point asks to load first for any Roblox task. It calibrates initiative
   and evidence; domain skills provide the technical knowledge.
2. Match the requested outcome and failure symptoms against all four groups
   below. A request can need several domains; recommend their order and explain
   what each contributes.
3. Pair domain knowledge with Ask Matt's main engineering flow when useful.
   Brain does not replace specification, TDD, debugging, code review, or handoff
   workflows. Follow project instructions and already granted authorization.
4. State capability limits. Studio work needs the selected connected bridge;
   cloud operations need suitable access. Repository reasoning can continue
   without a live Studio. An external library mentioned in a skill is an option
   to evaluate against the project, not an installation dependency of this map.

## Core: language, ownership, authority and state

| Skill | Reach for it when |
| --- | --- |
| [my-claude-skills:roblox-collaboration-mode](../../roblox-collaboration-mode/SKILL.md) | Starting any Roblox task; calibrating collaboration, initiative, uncertainty and evidence. |
| [my-claude-skills:roblox-luau-core](../../roblox-luau-core/SKILL.md) | Luau syntax, tables, scope, control flow, string patterns, or bugs caused by translating another language's assumptions. |
| [my-claude-skills:roblox-luau-types](../../roblox-luau-types/SKILL.md) | Type errors, narrowing, generics, exported types, strict checking, or solver-dependent syntax. |
| [my-claude-skills:roblox-luau-patterns](../../roblox-luau-patterns/SKILL.md) | Module/object shape, scheduling, signals, fallible calls, resource ownership and cleanup. |
| [my-claude-skills:roblox-architecture](../../roblox-architecture/SKILL.md) | Existing owners, module boundaries, runtime placement, dependency direction, startup or client/server responsibilities. |
| [my-claude-skills:roblox-networking](../../roblox-networking/SKILL.md) | Designing or fixing remote contracts, replication, payload validation, rate limits or server authority. |
| [my-claude-skills:roblox-security](../../roblox-security/SKILL.md) | Auditing exploit paths, authorization, movement, purchases, economy or untrusted data. |
| [my-claude-skills:roblox-data](../../roblox-data/SKILL.md) | Player saves, profile ownership, load/save failures, schemas, migrations, shutdown and durable transactions. |
| [my-claude-skills:roblox-server-data](../../roblox-server-data/SKILL.md) | Shared/world state, leaderboards, MessagingService, MemoryStore, matchmaking or cross-server coordination. |
| [my-claude-skills:roblox-performance](../../roblox-performance/SKILL.md) | Low frame rate, server spikes, memory growth, network cost, streaming or device-specific regressions. |

**Overlaps:** architecture identifies ownership; patterns shape an owned module.
Networking designs the boundary; security challenges it. Data owns durable player
state; server-data covers shared/cross-server systems. Performance starts from a
measured scenario rather than choosing optimizations from the symptom alone.

## Gameplay: what players see and control

| Skill | Reach for it when |
| --- | --- |
| [my-claude-skills:roblox-building](../../roblox-building/SKILL.md) | Maps, geometry, props, model placement, asset selection or generated scenery. |
| [my-claude-skills:roblox-physics](../../roblox-physics/SKILL.md) | Constraints, vehicles, projectiles, raycasts, ragdolls, moving platforms or network ownership. |
| [my-claude-skills:roblox-npc-ai](../../roblox-npc-ai/SKILL.md) | NPC detection, pathfinding, state machines, spawning, navigation or population management. |
| [my-claude-skills:roblox-camera](../../roblox-camera/SKILL.md) | Camera controllers, cutscenes, spectating, screen/world projection or camera restoration. |
| [my-claude-skills:roblox-input](../../roblox-input/SKILL.md) | Keyboard, mouse, touch, gamepad, action binding, focus, cancellation or hybrid input. |
| [my-claude-skills:roblox-gui](../../roblox-gui/SKILL.md) | HUDs, shops, menus, screen/world UI, layout, safe insets, state, responsiveness or focus navigation. |
| [my-claude-skills:roblox-animation-vfx](../../roblox-animation-vfx/SKILL.md) | Animation tracks/markers, particles, trails, beams, tweens and feedback effects. |
| [my-claude-skills:roblox-lighting](../../roblox-lighting/SKILL.md) | Lighting, atmosphere, post-processing, day/night cycles or scene readability. |
| [my-claude-skills:roblox-audio](../../roblox-audio/SKILL.md) | Sound cues, music, spatial audio, mixing, playback failures or sound cleanup. |
| [my-claude-skills:roblox-localization](../../roblox-localization/SKILL.md) | Translation tables, locale handling, fallback strings, translated layouts or localization testing. |

**Overlaps:** GUI owns presentation/state; input owns actions and device paths.
Camera and animation/VFX overlap on screen feedback, but camera ownership belongs
with the controller. Building owns geometry/assets; lighting owns illumination.
Use Roblox-specific presentation skills for engine behavior; web animation
skills elsewhere in Ask Matt do not supply Roblox APIs.

## Design: game structure, player evidence and purchases

| Skill | Reach for it when |
| --- | --- |
| [my-claude-skills:roblox-game-design](../../roblox-game-design/SKILL.md) | Core loops, onboarding, levels, progression, economy sources/sinks or game feel. |
| [my-claude-skills:roblox-player-psychology](../../roblox-player-psychology/SKILL.md) | Player motivation, reward schedules, goals, streaks, pricing perception, RNG/pity or community loops. |
| [my-claude-skills:roblox-growth-design](../../roblox-growth-design/SKILL.md) | Discovery, acquisition, retention diagnosis, thumbnails, experiments, positioning or LiveOps. |
| [my-claude-skills:roblox-analytics](../../roblox-analytics/SKILL.md) | Event taxonomy, economy events, funnels, onboarding traces, instrumentation or interpreting measured outcomes. |
| [my-claude-skills:roblox-monetization](../../roblox-monetization/SKILL.md) | Passes, developer products, receipts, entitlements, subscriptions, pricing APIs or purchase-policy implementation. |

**Overlaps:** game-design asks how the experience works; psychology asks how
players may perceive its mechanics. Growth diagnoses outcomes and experiments;
analytics establishes what the measurements mean. Monetization owns purchase
implementation, and pairs with data/security for durable, authorized grants.
Distinguish design hypotheses from observed behavior and current platform rules.

## Tools: operate, integrate and release

| Skill | Reach for it when |
| --- | --- |
| [my-claude-skills:roblox-studio-mcp](../../roblox-studio-mcp/SKILL.md) | Inspecting/changing Studio, selecting place/context, asset operations, runtime logs, screenshots or playtests. |
| [my-claude-skills:roblox-tooling](../../roblox-tooling/SKILL.md) | Rojo/sync ownership, package managers, tool pins, lint/format/type tooling, standalone tests, builds or CI. |
| [my-claude-skills:roblox-cloud](../../roblox-cloud/SKILL.md) | Open Cloud, API keys, OAuth, webhooks, external data access or teleport handoffs. |
| [my-claude-skills:roblox-publish-checklist](../../roblox-publish-checklist/SKILL.md) | Pre-release readiness, exact payload/evidence, rollback and verifying the serving build. |

**Overlaps:** tooling covers repository/build workflows; Studio MCP covers live
editor/runtime operations; cloud covers external integration. Publish-checklist
collects release evidence and does not itself authorize publication.

## Common combinations

- **Saves fail or progress duplicates:** architecture → data → security;
  add server-data for cross-server/shared state and Studio MCP for live evidence.
- **Shop UI or purchases break:** GUI + input for presentation; monetization +
  data for grants; networking + security for requests crossing the trust boundary.
- **NPCs get stuck or cause lag:** NPC AI + physics; performance for measurement;
  Studio MCP for the actual navigation/population scenario.
- **Onboarding or retention needs investigation:** game-design + analytics →
  growth-design; psychology supplies relevant hypotheses, not substitute metrics.
- **Preparing a release:** publish-checklist plus the domains changed; tooling
  for build/source parity and Studio MCP for supported live verification.

Return to Ask Matt's recommendation step with the selected exact invocations,
their order and rationale, and any missing skills or capabilities. This file is
a disclosed reference under a user-invoked router; it does not make `ask-matt`
automatically run outside an authorized invocation.
