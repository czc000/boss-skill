# boss-skill

Portable BOSS Zhipin automation helpers for Codex/Codex-style skill workflows.

This repository packages:
- reusable `boss_tools` scripts
- an installable `boss-daily-followup` skill
- sanitized SOP and memory documents
- install guidance for a fresh machine

## What This Repo Assumes

This repo does not replace `opencli`.

Users are expected to install and configure these dependencies themselves:
- Node.js 20+
- `opencli`
- opencli Browser Bridge extension
- Chrome or Chromium
- a valid logged-in BOSS Zhipin chat session in the browser

## Install

### 1. Install `opencli`

```bash
npm install -g @jackwener/opencli
```

### 2. Install the Browser Bridge extension

- Download the extension build from the opencli release page.
- Open `chrome://extensions/`
- Enable Developer Mode.
- Load the unpacked extension.

### 3. Verify host browser connectivity

Run this on the host environment, not inside a sandboxed network namespace:

```bash
opencli doctor
```

If `opencli doctor` and the visible browser state disagree, verify the daemon directly:

```bash
curl -H 'X-OpenCLI: 1' http://127.0.0.1:19825/status
```

### 4. Install the skill

From the repository root:

```bash
bash scripts/install.sh
```

This installs a rendered copy of `skills/boss-daily-followup/SKILL.md` into `~/.agents/skills/boss-daily-followup/`.

## Repository Layout

- `boss_tools/`: reusable BOSS scripts and tests
- `skills/`: skill template(s) to install into Codex/Codex-compatible environments
- `docs/`: setup, SOP, troubleshooting, migration notes
- `memory/`: sanitized BOSS-specific operating memory
- `scripts/`: helper scripts such as skill installation

## Daily Use

Run these from `boss_tools/` after host-side `opencli doctor` is healthy:

```bash
node src/commands/scan-today.mjs
node src/commands/process-today.mjs
```

## Privacy

This repo is meant to exclude:
- chat logs
- run summaries
- candidate identifiers
- raw resume file names
- personal machine-specific paths

Do not commit `boss_tools/logs/` or `boss_tools/runs/`.
