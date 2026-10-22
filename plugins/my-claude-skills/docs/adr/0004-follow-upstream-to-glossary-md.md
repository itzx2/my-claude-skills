# Follow upstream's rename of the domain glossary to GLOSSARY.md

Matt renamed the domain-doc convention from `CONTEXT.md` / `CONTEXT-MAP.md` to
`GLOSSARY.md` / `GLOSSARY-MAP.md` across eleven skills, with no fallback: the
skills only look for the new names. Keeping `CONTEXT.md` would have meant a
rename patch on each of those skills, re-applied at every sync, carefully
skipping `teach`'s own `GLOSSARY.md`. Following him costs one migration instead:
this repo's glossary, our own `ask-matt`, `handoff` and `project-brain`, and the
other repos that already hold a `CONTEXT.md` (Skill Verifier, Voice of
Customer), each `git mv`'d once.

## Consequences

The case for `CONTEXT.md` was real — "context" is the DDD word for a bounded
area of the model, and `CONTEXT-MAP.md` reads naturally — so this is a choice
to stay close to upstream, not a verdict on naming. One collision remains:
`teach` also writes `./GLOSSARY.md`, as its learning workspace's glossary, so
running `teach` inside a code repo would share one file between the two. `teach`
expects a workspace of its own, which keeps this theoretical.

Repos still on `CONTEXT.md` get no glossary from the skills until they are
migrated; nothing errors, the vocabulary is just not read.
