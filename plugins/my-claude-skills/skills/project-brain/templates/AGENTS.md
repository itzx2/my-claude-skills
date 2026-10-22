# <Project name>

<One or two sentences: what this is, and what stage it is at.>

## Read these first

1. `<path>` — <why it matters; what goes wrong if you skip it>
2. `<path>` — <why it matters>
3. `<path>` — <why it matters>

Describe a directory rather than listing what is in it. `every ADR in docs/adr/` stays true as records are added; `docs/adr/0001–0007` is wrong the moment someone writes the next one.

## Rules that bind

- <A constraint that is load-bearing and non-obvious. State the positive form: what to do, not what to avoid.>

## Where things live

| Layer | Path |
|---|---|
| Vocabulary | `<path>` |
| Decisions | `<path>` |
| Plans | `<path>` |
| Current state | `<the state directory, newest file>` |

Leave a layer's row reading `none yet` when it genuinely has no home — an honest gap beats a path that resolves to nothing.

## Keeping this true

These apply for the whole session, not only when someone asks.

- **<Standing rule, imperative, addressed to the agent.>** <What to do, where, and the skill that does it in one pass.>
- **<Standing rule.>** <...>

Write this section as rules, never as a `when → do this` table. A table gets consulted; rules get obeyed. Each line states an action with no completion state, so it keeps applying for the whole session — the property that makes behavioural guidance stick.

Cover at least: settling a new term before it is used, recording a hard-to-reverse decision when it is made, and writing the handoff before the session ends. Name the skills that actually exist in this environment.

## Current state

See the newest file in `<state directory>` — what is true right now, and what is still open.

<!-- This router holds only what stays true across sessions.
     Dated facts belong in the state directory above, never here. -->
