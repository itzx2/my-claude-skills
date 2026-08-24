# Skills Briefing

The language for how this repo tells an agent what skills a session actually
has. The problem it exists for: Claude Code hides some skills from the agent
entirely, so without a briefing they may as well not be installed.

## Language

**Roster**:
The set of skills a briefing reports for one session, built at session start.
_Avoid_: list, inventory, manifest

**Location**:
A directory that holds skills — loose `~/.claude/skills`, the nested
`synced/` beneath it, an installed plugin's `skills/` or `commands/`, or a
project's `.claude/skills`. The unit the walk iterates over.
_Avoid_: source, place, situation

**Tier**:
Whether a location is reachable by a filesystem walk at all. `on-disk` is
walkable; `harness-injected` exists only inside the running session and no
hook can enumerate it.
_Avoid_: type, category, kind

**Hidden**:
A skill with `disable-model-invocation: true`, which Claude Code omits from
the agent's Skill listing. Hidden skills are the entire reason the briefing
exists; visible ones are already covered by the listing.
_Avoid_: disabled, private, user-only

**Blind spot**:
A skill the roster cannot report — today, every harness-injected one. The
briefing states its own blind spots rather than implying the roster is
complete.
_Avoid_: gap, miss, hole

**Invocation**:
The exact string the user types to start a skill. Plugin-provided skills are
namespaced `plugin:skill`; loose and nested ones stay bare. The one thing an
agent cannot reconstruct on its own, so the roster always carries it verbatim.
_Avoid_: name, slug, command
