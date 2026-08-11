#!/usr/bin/env python3
"""Emit a SessionStart additionalContext payload describing the installed skills.

Reads ~/.claude/skills/*/SKILL.md front matter and splits the skills into the
two groups that behave differently at runtime:

  * model-invokable  - no `disable-model-invocation`, so they already appear in
    the agent's Skill-tool listing. The agent may call these itself.
  * user-invoked     - `disable-model-invocation: true`, so Claude Code hides
    them from the agent entirely. The agent can only recommend them by name.

The second group is the reason this script exists: without it an agent has no
way to know those skills are installed at all.

Prints a single line of JSON on stdout, per the SessionStart hook contract.
Stays silent (exit 0, no output) when there is nothing useful to say, so the
hook never injects an empty section.
"""

import json
import os
import sys

# Front matter keys we care about. Everything else is ignored.
NAME = "name"
DESCRIPTION = "description"
DISABLE = "disable-model-invocation"


def parse_front_matter(path):
    """Return the front-matter mapping of a SKILL.md, or {} if it has none.

    Deliberately not a YAML parser: skill front matter is flat `key: value`
    pairs, and depending on PyYAML would make the hook fail on containers that
    don't have it. Handles the two quoting styles that occur in practice and
    folds YAML block scalars (`key: >-`) into a single line.
    """
    try:
        with open(path, encoding="utf-8") as handle:
            lines = handle.read().splitlines()
    except OSError:
        return {}

    if not lines or lines[0].strip() != "---":
        return {}

    fields = {}
    key = None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        # Continuation of a block scalar or a wrapped value.
        if key and (line.startswith((" ", "\t"))) and ":" not in line.split("#")[0]:
            fields[key] = (fields[key] + " " + line.strip()).strip()
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        # Block scalar introducers carry their value on the following lines.
        if value in (">", ">-", "|", "|-"):
            value = ""
        elif len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        fields[key] = value
    return fields


def is_truthy(value):
    return str(value).strip().lower() in ("true", "yes", "1")


def first_sentence(text, limit=160):
    """Trim a description down to a roster-sized summary.

    Descriptions double as trigger lists, so they run long and often carry
    parenthetical asides containing their own '?' or '.'. Only break on
    terminators at bracket depth zero that are followed by a new sentence.
    """
    text = " ".join(text.split())
    if not text:
        return ""

    depth = 0
    for index, char in enumerate(text):
        if char in "([{":
            depth += 1
        elif char in ")]}":
            depth = max(0, depth - 1)
        elif char in ".!?" and depth == 0 and index >= 30:
            rest = text[index + 1 :]
            if not rest:
                return text
            # A terminator mid-word (version numbers, "e.g.") isn't a break.
            if rest[0] == " " and rest[1:2].isupper():
                return text[: index + 1]

    if len(text) > limit:
        return text[:limit].rsplit(" ", 1)[0] + "…"
    return text


def collect(skills_dir):
    model_invokable, user_invoked = [], []
    try:
        entries = sorted(os.listdir(skills_dir))
    except OSError:
        return model_invokable, user_invoked

    for entry in entries:
        skill_md = os.path.join(skills_dir, entry, "SKILL.md")
        if not os.path.isfile(skill_md):
            continue
        fields = parse_front_matter(skill_md)
        name = fields.get(NAME) or entry
        description = first_sentence(fields.get(DESCRIPTION, ""))
        bucket = user_invoked if is_truthy(fields.get(DISABLE, "")) else model_invokable
        bucket.append((name, description))
    return model_invokable, user_invoked


def render(model_invokable, user_invoked):
    out = [
        "# Installed personal skills (itzx2/my-claude-skills)",
        "",
        "These skills are installed at `~/.claude/skills`. They encode how this "
        "user wants recurring work done, so prefer a matching skill over "
        "improvising your own approach.",
        "",
    ]

    if model_invokable:
        out += [
            "## Model-invokable — you can call these yourself",
            "",
            "Already listed in your Skill tool with full descriptions. Invoke via "
            "`Skill` as soon as a request matches one, without asking permission "
            "first; the roster below is a recall aid, not the authoritative "
            "trigger list.",
            "",
        ]
        out += [
            f"- `{name}` — {description}" if description else f"- `{name}`"
            for name, description in model_invokable
        ]
        out.append("")

    if user_invoked:
        out += [
            "## User-invoked only — you cannot call these",
            "",
            "These set `disable-model-invocation: true`, so Claude Code hides "
            "them from your Skill listing and you have no way to discover them "
            "mid-session. **This section is the only place you learn they "
            "exist.** You must not invoke them on your own. When one clearly "
            "fits what the user is doing, say so in a sentence and let them run "
            "it — e.g. \"`/to-tickets` would break this plan into tickets if you "
            "want it.\" Suggest at most one per reply, and only when it beats "
            "just doing the work.",
            "",
        ]
        out += [
            f"- `/{name}` — {description}" if description else f"- `/{name}`"
            for name, description in user_invoked
        ]
        out.append("")

    out += [
        "If the user types `/<name>` for any skill above, invoke it via `Skill` "
        "with that exact name.",
    ]
    return "\n".join(out)


def main():
    skills_dir = os.environ.get(
        "CLAUDE_SKILLS_DIR", os.path.expanduser("~/.claude/skills")
    )
    model_invokable, user_invoked = collect(skills_dir)
    if not model_invokable and not user_invoked:
        return 0

    payload = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            # The skills were copied into place moments ago by the same hook, so
            # ask the session to re-scan rather than run with a stale listing.
            "reloadSkills": True,
            "additionalContext": render(model_invokable, user_invoked),
        }
    }
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
