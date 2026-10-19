---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Where the work wants isolating from the current checkout, call the Skill tool with "my-claude-skills:using-git-worktrees" to set the workspace up before starting.

Call the Skill tool with "my-claude-skills:tdd" where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, call the Skill tool with "my-claude-skills:code-review" to review the work.

Commit your work to the current branch, then call the Skill tool with "my-claude-skills:finishing-a-development-branch" to settle where that branch goes.
