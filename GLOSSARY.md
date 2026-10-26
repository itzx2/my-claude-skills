# Telling a Session What It Cannot See

The language for the two things a fresh session lacks and cannot recover on its
own: which skills it actually has, and what the session before it knew. Both are
invisible by default — Claude Code hides some skills from the agent entirely,
and a conversation leaves no trace once it ends. Alongside them, the language
for where the shipped skills come from.

## Language

### Briefing

**Roster**:
The set of skills a plugin's briefing reports: that plugin's own skills,
built when the briefing runs.
_Avoid_: list, inventory, manifest

**Location**:
A directory that holds skills — a plugin's `skills/` or `commands/`, or a
container grouping skills inside one. The unit the walk iterates over; a
briefing walks only the locations of the plugin it ships in.
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
A skill the roster cannot report — everything outside the briefing's own
plugin: other plugins (which brief their own), loose skills, and every
harness-injected one. The briefing states its own blind spots rather than
implying the roster is complete.
_Avoid_: gap, miss, hole

**Invocation**:
The exact string the user types to start a skill. Plugin-provided skills are
namespaced `plugin:skill`, nested ones included; loose ones stay bare. The one thing an
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

### Vendoring

**Upstream**:
A repository this plugin takes skills from rather than writing them here.
_Avoid_: source, origin, vendor

**Vendored**:
A skill this plugin ships that came from an upstream, whether verbatim,
patched or forked.
_Avoid_: imported, third-party, external

**Pin**:
The upstream commit a vendored skill was last taken from. Every verbatim or
patched skill has exactly one.
_Avoid_: version, baseline, snapshot

**Verbatim**:
A vendored skill identical to its upstream at the pin, apart from the
namespace rewrite its upstream may ask for.
_Avoid_: unmodified, stock, vanilla

**Patched**:
A vendored skill taken from upstream at the pin with an edit of ours that is
recorded and re-applied on every sync.
_Avoid_: modified, customised, tweaked

**Forked**:
A skill that started from an upstream one but is now maintained here and no
longer synced; upstream changes reach it only by hand.
_Avoid_: diverged, rewritten, ours

**Absorbed**:
Upstream content merged into one of this plugin's own skills or hooks
instead of shipping as a skill of its own.
_Avoid_: merged, folded in, inlined

**Sync**:
Re-taking every verbatim and patched skill from one upstream at a new pin.
_Avoid_: update, upgrade, pull

**Vendor record**:
The one file listing every upstream with its pin, and every vendored skill
with its status and, for a patched one, each edit's purpose and the check that
proves it landed.
_Avoid_: manifest, lockfile, registry

**Clash**:
A short skill name the Skill tool would resolve to something other than this
plugin's skill, such as a harness built-in of the same name. Vendored
references to a clashing name are rewritten to its full invocation.
_Avoid_: collision, conflict, shadowing
