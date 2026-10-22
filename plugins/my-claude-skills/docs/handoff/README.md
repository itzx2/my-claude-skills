# Handoffs

This folder holds **exactly one** handoff — the live brief, named
`YYYY-MM-DD-<slug>.md`. Read that file. Everything else is in `archive/`, which
nothing reads: an archived handoff is stale by definition, and anything in it
worth keeping was moved out to a primary source before it was archived.

## A published handoff is read-only

A handoff is **published** the moment the invocation that wrote it ends. From
then on it is a fixed record — to every session, including the one that wrote
it. The way to change what a handoff says is to write a **new** one.

Writing, replacing, archiving and correcting a handoff are one operation, and
the `handoff` skill is the only thing that performs it. Invoke it as
`/handoff`, or `/my-claude-skills:handoff` where it is installed as a plugin.
It is user-invoked, so it will not appear in an agent's own skill listing —
absent from that listing means hidden, never missing.

If the live brief should be replaced, **say so and let the user invoke the
skill**. The invocation is theirs to make.

Stated plainly, because it is the failure this folder keeps having: a published
handoff is not edited, a handoff is not written by hand, and this procedure is
not reconstructed from this README. **Reading this file is not authority to
perform what it describes.**

## A stale handoff is working correctly

The live brief goes out of date the moment the next session does anything. That
is its normal condition, not a defect to repair. It is a snapshot, and a
snapshot someone has gone back and touched up is no longer evidence of
anything — the staleness is what keeps it honest.

So a brief whose facts have moved is not a task. Once, if it matters, say as a
fact that the live brief predates recent work and that the skill would replace
it. Then leave it alone.
