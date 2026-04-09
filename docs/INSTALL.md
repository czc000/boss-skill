# Installation

## Model

This repository is lightweight by design:
- Codex should check the machine first
- Codex should auto-install CLI dependencies when possible
- Codex should stop and ask for manual browser steps when required

Manual-only requirements:
- Browser Bridge extension installed/enabled
- authenticated BOSS Zhipin browser session

## Fresh Machine Setup

1. Install Node.js 20+.
2. Clone this repository.
3. Run one of these:

   Linux/macOS:

   ```bash
   bash scripts/bootstrap.sh
   ```

   Cross-platform:

   ```bash
   node scripts/bootstrap.mjs
   ```

   Windows PowerShell:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
   ```

4. If bootstrap reports manual steps:
   - install/enable Browser Bridge in Chrome/Chromium
   - log into BOSS Zhipin in the same browser profile you intend to automate
5. Run bootstrap again until preflight is clean.

## Validation

From `boss_tools/`:

```bash
npm test
```

When bootstrap / preflight reports the environment is ready:

```bash
node src/commands/scan-today.mjs
```
