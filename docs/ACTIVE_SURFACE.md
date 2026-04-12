# Active Surface

This file is the canonical alignment map for what `boss-skill` currently uses in production-like runs.

## Skill

- Source of truth: `skills/boss-daily-followup/SKILL.md`
- Installed runtime target: `~/.agents/skills/boss-daily-followup/SKILL.md`
- Install path renderer: `scripts/install-skill.mjs`

The installed skill must match the repo template except for `__BOSS_SKILL_ROOT__` being rendered to the local absolute repo path.

## Memory

The skill is backed by these sanitized memory documents:

- `memory/boss-operational-constraints.md`
- `memory/boss-lessons-learned.md`

These memory files should agree with the skill on:

- host-side readiness checks
- one-tab / one-`tabId` execution
- no mixed control chains
- filter-first classification
- active-conversation-only evidence
- attachment approval verification
- resume-request verification
- reply handling rules

## Tools

The canonical tool lane is:

1. `boss_tools/src/commands/scan-today.mjs`
2. `boss_tools/src/commands/process-today.mjs`
3. `boss_tools/src/commands/reply-needs.mjs`

The supporting tool primitives are:

- `boss_tools/src/lib/opencli-boss-core.mjs`
- `boss_tools/src/lib/classify.mjs`
- `boss_tools/src/lib/reply-needs.mjs`
- host-side `opencli doctor`
- host-side `opencli boss chatlist --limit 1 -f json` as a bootstrap/readiness fallback

## Alignment Rules

- Do not document `opencli boss chatmsg` as the primary source of truth for resume-request state.
- Do not document `opencli boss send` as the primary batch action path.
- If `reply-needs.mjs` is supported in code, it must be listed in the skill and tool docs.
- If troubleshooting mentions daemon recovery, it must mention the host-side BOSS read bootstrap fallback.
- If skill logic changes, rerun `node scripts/install-skill.mjs` so the installed skill matches the repo template.
