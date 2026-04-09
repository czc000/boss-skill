# Daily SOP

## Before Any BOSS Run

1. Use the host environment.
2. Run:

   ```bash
   opencli doctor
   ```

3. If the result is inconsistent with the visible browser state, run:

   ```bash
   curl -H 'X-OpenCLI: 1' http://127.0.0.1:19825/status
   ```

4. Stop immediately if host `opencli doctor` and host `/status` cannot confirm the extension is connected.

## Processing Order

1. Scan first:

   ```bash
   node src/commands/scan-today.mjs
   ```

2. Read the run summary.
3. Only if needed, process:

   ```bash
   node src/commands/process-today.mjs
   ```

## Safety Rules

- Preserve the logged-in BOSS session over task completion.
- Never run parallel chat actions.
- Do not repeatedly reopen the chat page.
- Stay on one stable `tabId` per run.
- Do not mix control chains in one run.
- Filter `isFiltered === true` contacts before conversation-level logic.

## Resume Handling

- `简历请求已发送` means already handled.
- Attachment resume handling should treat actual file/handled evidence as stronger than stale historical prompt text.
- Do not treat online resume cards alone as already handled.
