# Roblox routes

The single source for routing between the Roblox domain skills, read by
`ask-roblox` and pointed at by the plugin's briefing. Every skill is invoked as
`my-roblox-skills:<name>`. Each skill's own description, in the Skill listing,
says what it covers; this file carries what no description can: which domain
**owns** a question when two touch it, and which domains a common problem needs
together.

## First

`roblox-collaboration-mode` is loaded first on every Roblox task. It sets
initiative and which decisions need the user; the domains supply engine
knowledge.

## Domains

- **Core:** `roblox-collaboration-mode`, `roblox-luau-core`, `roblox-luau-types`, `roblox-luau-patterns`, `roblox-architecture`, `roblox-networking`, `roblox-security`, `roblox-data`, `roblox-server-data`, `roblox-performance`
- **Gameplay:** `roblox-building`, `roblox-physics`, `roblox-npc-ai`, `roblox-camera`, `roblox-input`, `roblox-gui`, `roblox-animation-vfx`, `roblox-lighting`, `roblox-audio`, `roblox-localization`
- **Design:** `roblox-game-design`, `roblox-player-psychology`, `roblox-growth-design`, `roblox-analytics`, `roblox-monetization`
- **Tools:** `roblox-studio-mcp`, `roblox-tooling`, `roblox-cloud`, `roblox-publish-checklist`

## Owners

- Architecture owns where code lives; luau-patterns owns the shape of a module once placed.
- Networking owns the remote's contract; security owns attacking it. Anything the client sends gets both.
- Data owns durable player saves; server-data owns shared and cross-server state.
- GUI owns presentation and UI state; input owns actions and device paths.
- The camera controller owns the camera; animation-vfx owns feedback effects on screen.
- Building owns geometry and assets; lighting owns illumination.
- Game-design owns how the experience works; player-psychology owns how players perceive it.
- Analytics owns what a measurement means; growth-design owns diagnosing outcomes and running experiments.
- Monetization owns purchase code, with data and security owning the durable, authorized grant.
- Performance owns measurement: it starts from a measured scenario.
- Studio-mcp owns live editor and runtime work; tooling owns the repository and build; cloud owns access from outside the game.
- Roblox engine behavior comes from these domains, including motion: web animation skills supply web APIs.

## Combinations

- **Saves fail or progress duplicates:** architecture → data → security; add server-data for shared or cross-server state, studio-mcp for live evidence.
- **Shop UI or purchases break:** gui + input for presentation; monetization + data for grants; networking + security for the requests crossing the trust boundary.
- **NPCs get stuck or cause lag:** npc-ai + physics; performance to measure; studio-mcp for the real navigation or population scenario.
- **Onboarding or retention:** game-design + analytics → growth-design; player-psychology supplies hypotheses, analytics supplies the metrics.
- **A new feature:** architecture to place it → the gameplay or design domains it touches → networking + security for everything the client sends.
- **A release:** publish-checklist plus every domain the release changed; tooling for build/source parity, studio-mcp for live verification. Publishing itself stays the user's call.

## Capability limits

Studio work needs a connected Studio MCP bridge; cloud work needs Open Cloud
access. Repository reasoning proceeds without either. A library a skill mentions
is an option to weigh against the project.

---

Groups, owners and combinations are adapted from the structure of
[TabooHarmony/roblox-brain](https://github.com/TabooHarmony/roblox-brain) (MIT),
the source of every domain skill named here.
