# boss-skill

Portable BOSS Zhipin automation helpers for Codex/Codex-style skill workflows.

This repository packages:
- reusable `boss_tools` scripts
- an installable `boss-daily-followup` skill
- sanitized SOP and memory documents
- install guidance for a fresh machine

## Current Canonical Surface

The current portable workflow has one canonical lane:

- Skill template: `skills/boss-daily-followup/SKILL.md`
- Installed skill target: `~/.agents/skills/boss-daily-followup/SKILL.md`
- Backing memory: `memory/boss-operational-constraints.md`, `memory/boss-lessons-learned.md`
- Primary tools: `boss_tools/src/commands/scan-today.mjs`, `process-today.mjs`, `reply-needs.mjs`

See `docs/ACTIVE_SURFACE.md` for the alignment contract between skill, memory, and tools.
See `docs/PORTABILITY_AND_SELF_DEBUG.md` for environment-drift notes and self-debug guidance when a new machine behaves differently.

## What This Repo Assumes

This repo does not bundle the browser extension or BOSS login state.

It is designed so Codex can:
- detect missing CLI dependencies
- auto-install `opencli` when possible
- install the skill into the local Codex skills directory
- tell the user when a manual browser step is still required

Manual-only requirements:
- Browser Bridge extension installed/enabled
- a valid logged-in BOSS Zhipin chat session in the browser

## Install

Recommended entrypoints:

- Linux/macOS:

  ```bash
  bash scripts/bootstrap.sh
  ```

- Cross-platform / Codex-friendly:

  ```bash
  node scripts/bootstrap.mjs
  ```

- Windows PowerShell:

  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
  ```

`bootstrap` will:
- check `node`, `npm`, and `opencli`
- auto-install `opencli` when possible
- install the rendered skill
- report manual browser steps still required

## Repository Layout

- `boss_tools/`: reusable BOSS scripts and tests
- `skills/`: skill template(s) to install into Codex/Codex-compatible environments
- `docs/`: setup, SOP, troubleshooting, migration notes
- `memory/`: sanitized BOSS-specific operating memory
- `scripts/`: bootstrap, preflight, and install helpers

## Daily Use

Run these from `boss_tools/` after bootstrap reports the environment is ready:

```bash
node src/commands/scan-today.mjs
node src/commands/process-today.mjs
node src/commands/reply-needs.mjs draft
```

Use `reply-needs.mjs` only when the scan or process summary reports `needs_reply_count > 0`.

## Privacy

This repo is meant to exclude:
- chat logs
- run summaries
- candidate identifiers
- raw resume file names
- personal machine-specific paths

Do not commit `boss_tools/logs/` or `boss_tools/runs/`.
