# Telling a Session What It Cannot See

The language for the two things a fresh session lacks and cannot recover on its
own: which skills it actually has, and what the session before it knew. Both are
invisible by default — Claude Code hides some skills from the agent entirely,
and a conversation leaves no trace once it ends.

## Language

### Briefing

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

**Hand-rolled invocation**:
An agent performing a hidden skill's procedure by hand, from prose it found in
the repo, because no roster named the skill and its listing did not carry it.
The failure the briefing exists to prevent, and always a bug — the procedure it
reconstructs is never the one that ships.
_Avoid_: improvising, manual run, working around

### Handoff

**Live brief**:
The single handoff that is not archived — the one document a new session reads
to learn what the last one knew. A folder holds exactly one.
_Avoid_: current handoff, latest handoff, the handoff doc

**Published**:
The state a handoff enters the moment the invocation that wrote it ends. A
published handoff is frozen: no session may alter it, including the session
that wrote it.
_Avoid_: committed, merged, final, saved

**Archive**:
Where a handoff goes when a newer one replaces it. Nothing reads it — moving a
file there is the only statement ever made that it is stale.
_Avoid_: history, old handoffs, previous versions
