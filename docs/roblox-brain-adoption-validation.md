# Roblox Brain adoption validation

## Candidate evidence, 2026-10-22

Reviewed implementation: `b1e1a46d36744d3991eb74430cbfe48ab74d843f`, draft PR
https://github.com/itzx2/my-claude-skills/pull/19. This evidence covers six Brain
skills at plugin version 2.2.0, with 51 total plugin skills and 13 Brain Markdown
files. It does not validate later additions.

- Standards review: no findings. Spec review: one P2, fixed by gating the optional
  Studio subagent capability on live advertised task-compatible modes.
- Briefing fixtures: 10 passed, six existing Windows fixture failures, reproduced
  on the baseline (plugin/hidden skills, plugin/nested commands, duplicates and
  stress roster). The actual roster cap case passed. This suite is not green.
- Install race: 7/7 passed. Subagent guard: 44/44 passed.
- Vendor check: all upstreams passed with exact cache paths trusted per command.
- Disposable remote branch install: registry SHA and marketplace HEAD matched the
  reviewed implementation; version 2.2.0 and all 51 skills were reachable.
  Brain resources, vendor metadata and MIT notice matched. Seven files differed
  only by CRLF/LF; content comparison normalized line endings, not byte identity.
- No normal user install, merge, tag or release. Studio listing returned no
  connected studios; no game changes or live playtest evidence.

Skills load as Markdown without extra packages. Studio work needs a separately
configured, connected MCP bridge. ProfileStore and other libraries are conditional
project choices; upstream Python/PyYAML/Luau CI tools are not loading requirements.

## Reproduction on Windows

Working clone: `F:\Users\first\AppData\Local\Temp\my-claude-skills-roblox-brain-20261021`.
Source cache: `%TEMP%\my-claude-skills-vendor\roblox-brain`. Both are temporary;
recover the branch from GitHub if missing.

Use `F:\Program Files\Git\usr\bin\bash.exe`; PATH's bash is a WSL stub.
Prepend Git's `usr\bin` and `mingw64\bin` to the process PATH before launching
from PowerShell, so commands such as dirname and mktemp are available. Launching
the executable alone with the inherited Windows PATH produced invalid test runs;
reruns with the complete Git PATH yielded the results above.
For vendor cache ownership errors, set command-scoped `GIT_CONFIG_COUNT` and
indexed `GIT_CONFIG_KEY_i=safe.directory` / `GIT_CONFIG_VALUE_i=<exact cache>` for
each upstream in the record. Do not configure global wildcard trust.

The race fixture without flock may copy many Windows binaries; allow about
300 seconds and poll asynchronously. A short timeout does not establish a hang.

Retained disposable config:
`F:\Users\first\AppData\Local\Temp\mcs-pr19-remote-install-eb8e7c85c7494b8e936539328e0af4ba`.
Set `CLAUDE_CONFIG_DIR` to it for the 51-skill reachability check. The normal
session's older 45-skill roster is not proof that the candidate package failed.

Local-path marketplace installs were rejected by CLI trust checks. The supported
remote branch source worked from a neutral directory in a fresh disposable config:

```sh
claude plugin marketplace add 'https://github.com/itzx2/my-claude-skills.git#codex/roblox-brain-adoption' --scope user
claude plugin install 'my-claude-skills@my-claude-skills' --scope user -y
```

Working CLI snapshot: bundled Claude Code 2.1.299, under
`F:\Users\first\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude-code\2.1.299\f0584be0fbaf\claude.exe`.
Refresh availability before relying on this path. Do not forge registries or
disable trust protections. GitHub connector calls were unavailable; `gh` worked.
