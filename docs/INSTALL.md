# Installation

## Dependencies

Required:
- Node.js 20+
- `opencli`
- opencli Browser Bridge extension
- Chrome or Chromium
- an authenticated BOSS Zhipin browser session

## Fresh Machine Setup

1. Install Node.js.
2. Install opencli:

   ```bash
   npm install -g @jackwener/opencli
   ```

3. Install the Browser Bridge extension in Chrome/Chromium.
4. Log into BOSS Zhipin in the same browser profile you intend to automate.
5. From the host shell, verify:

   ```bash
   opencli doctor
   ```

6. If the result is ambiguous, verify the daemon directly:

   ```bash
   curl -H 'X-OpenCLI: 1' http://127.0.0.1:19825/status
   ```

7. Clone this repository.
8. Run:

   ```bash
   bash scripts/install.sh
   ```

## Validation

From `boss_tools/`:

```bash
npm test
```

When browser connectivity is healthy:

```bash
node src/commands/scan-today.mjs
```
