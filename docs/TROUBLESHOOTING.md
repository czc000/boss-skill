# Troubleshooting

For environment-drift and first-run-on-Windows issues, also read:

- `docs/PORTABILITY_AND_SELF_DEBUG.md`

## `opencli doctor` says not connected

- Run it on the host environment, not in a sandboxed namespace.
- If needed, confirm daemon state directly:

  ```bash
  curl -H 'X-OpenCLI: 1' http://127.0.0.1:19825/status
  ```

- If the daemon is idle and has exited, rerun `opencli doctor`.

## `scan-today.mjs` says daemon is not running

The opencli daemon auto-exits after idle time. Restart it with:

```bash
opencli doctor
```

If that still fails, bootstrap the host-side path with:

```bash
opencli boss chatlist --limit 1 -f json
```

Then rerun the scan.

## Attachment approval is shown but already handled

Historical BOSS system text can remain visible even after the attachment has already been handled.

Current logic treats these as already handled when there is stronger evidence such as:
- disabled `同意`
- attachment file present in conversation
- recruiter acknowledgement such as `简历我们有收到了`

## New machine works differently even though the workflow still makes sense

If the workflow logic still looks right but the code fails on a different machine, browser, or `opencli` build, check:

- `docs/PORTABILITY_AND_SELF_DEBUG.md`

The most common causes are:

- `opencli` response-shape drift such as `tabId` vs `page`
- chat-list DOM drift such as no legacy `.user-list`
- lazy-loading / retry budget being too small
- side effects not being followed by immediate re-classification
