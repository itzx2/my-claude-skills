# Handoff integrity is instructed, not enforced

A published handoff must never be altered, but the rule is carried by prose —
`AGENTS.md`, the handoff folder's `README.md`, and the skill body — rather than
by anything that can stop a write. The alternative was available and was
rejected: the plugin already ships `hooks/hooks.json`, a `PreToolUse` hook can
deny `Write`/`Edit` against a path, and the session transcript on disk records
slash-command invocations verbatim, so a hook could have told an authorised
`/handoff` run from any other write. Instruction was chosen for its
transparency — a rule an agent can read and reason about, in a repository whose
whole subject is what agents are told.

## Consequences

The rule binds only where it is loaded, which makes **placement the entire
design**. A prohibition in `docs/handoff/README.md` governs nothing: nothing
loads that file, and Voice-of-Customer's own `AGENTS.md` says so in as many
words — *"`handoff/README.md` is where this rule lives and why; it is not loaded
into context automatically, which is why it is restated here."* So the rule
travels into `AGENTS.md`/`CLAUDE.md` of every repo that uses the skill, and the
README exists for the human who goes looking rather than the agent that never
does.

It follows that this control fails silently in exactly one situation, and it is
worth naming: a session whose `AGENTS.md` does not carry the rule will breach it
without ever knowing the rule exists, and nothing will report that it did.
