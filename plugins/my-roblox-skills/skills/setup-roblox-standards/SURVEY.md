# Survey brief

You are surveying one standards **section** of a Roblox repo for `setup-roblox-standards`. Your report is your only output: write, move and delete nothing, in the repo or in Studio.

You are given the section, its domain skills, its template and the repo root.

## 1. Load

Load `my-roblox-skills:roblox-collaboration-mode`, then only your section's domain skills. Read the template so your draft fits its format.

*Done when* those skills are loaded and you know the template's rule groups and rule shape.

## 2. Read the repo outside-in

Work from configuration toward code, and stop when the picture stops changing:

1. The Rojo project file(s) (`*.project.json`): which folder maps to which runtime location.
2. Each mapped location's tree, two levels deep.
3. The startup path: the server and client entry scripts and what they require, in order.
4. Where remotes are declared and where they are handled.
5. The package manifest (`wally.toml`, `pesde.toml`) and the toolchain config (`rokit.toml`, `aftman.toml`, `foreman.toml`, `selene.toml`, `stylua.toml`, `.luaurc`).
6. The existing docs: README, `AGENTS.md`, `CLAUDE.md`, any standards or architecture doc.

Then read the code your section touches. Skip package folders (`Packages`, `DevPackages`, `ServerPackages`, and any folder the manifest installs into): vendored code is not house practice.

**Studio-only source is a second place.** Code can live only in Studio, outside the Rojo mapping: in a saved place (`.rbxl`, `.rbxlx`) or in a service the project file does not sync. List every such location you find. When a Studio MCP bridge is connected, load `my-roblox-skills:roblox-studio-mcp` and inspect them read-only. A location you could not inspect is a **survey gap**, never evidence that nothing is there. For player data, confirm there is exactly one save owner across Git and Studio together: a missed Studio-only save path is how duplicate persistence happens.

*Done when* you have read each of the six, every Studio-only location is inspected or listed as a gap, and you can name the files that own your section's concerns.

## 3. Report

Return, in this order:

1. **House practice**: what the repo does for your section, each fact with its path(s).
2. **Clashes**: where house practice differs from the guidance. Say for each whether it is shape (house practice wins) or a trust, authority, data-loss or cleanup defect (guidance wins, and the user must decide).
3. **Mechanical candidates**: rules a linter could enforce, and for a repo with Selene, the config that would, confirmed by running the repo's pinned Selene against a scratch copy of the config: a lint level it ignores looks exactly like one it accepts.
4. **Survey gaps**: what you could not check, and why.
5. **Draft section**: rules in the template's format, each naming a real path, about fifteen at most.

*Done when* every fact carries a path, every clash is classified, and every draft rule names a path that exists.
