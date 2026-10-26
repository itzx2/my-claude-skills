---
name: ask-roblox
description: Ask which Roblox skills fit your situation, in what order. A router over the Roblox domain skills in this plugin.
disable-model-invocation: true
---

# Ask Roblox

Route a Roblox situation to the domain skills that own it.

## 1. Read the routes and the listing

Read [ROUTES.md](ROUTES.md): the domain groups, which domain **owns** a question when two touch it, and the common combinations. Then read your Skill listing for every `my-roblox-skills:roblox-*` skill with its description. The listing wins where the two disagree: a skill listed there is available even when ROUTES.md omits it.

*Done when* you hold both.

## 2. Find the owners

Break the situation into the questions it raises, and give each question its **owner** domain, using the Owners section to settle any question two domains touch. Check the Combinations section for a match. When the work also needs process (a spec, TDD, debugging, review), add the engineering skill for it: with `my-claude-skills` installed, `/my-claude-skills:ask-matt` routes those.

*Done when* every question in the situation has exactly one owner, and every owner is a skill in your Skill listing.

## 3. Recommend

Give the route, starting with the skill ROUTES.md names under **First**:

- each owner's exact invocation, in order, with one sentence on what it contributes;
- the engineering skills, at the point in the order where they apply;
- the capability the route needs that the session may lack (a Studio MCP bridge, Open Cloud access).

Read a skill's `SKILL.md`, and its `references/full.md` where the depth matters, before stating what it does or advising that a step of it be skipped.

*Done when* the user could invoke the route top to bottom from your answer alone.
