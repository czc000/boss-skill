# BOSS Lessons Learned

## Host-Side Connectivity Checks

- `opencli doctor` must be checked from the host environment that can see the real Chrome extension.
- A sandbox-local connectivity check is not authoritative for BOSS session safety.
- If `opencli doctor` and visible browser state disagree, verify host daemon state through `/status`.
- `No daemon connected` before the first real `opencli` command can still be normal.
- A successful host-side `opencli boss ...` read command is often a better runtime readiness signal than a stale `doctor` result.
- If a processing script reports `opencli daemon is not running`, bootstrap first with a minimal BOSS read command, then rerun the script.

## Attachment Resume Misclassification

- Historical BOSS system text can remain in chat after an attachment resume has already been handled.
- `对方想发送附件简历给您，您是否同意` by itself is not enough to classify a chat as pending.
- Stronger already-handled signals include:
  - disabled `同意`
  - attachment file visible in the conversation
  - recruiter acknowledgement such as `简历我们有收到了`

## Resume Request Misclassification

- `resume-already-requested` must be based on the active conversation body, not on side-list preview text or whole-page visible text.
- When switching chats, a fixed sleep is not enough; first confirm the target row is actually active, then read the conversation.
- Hidden or stale conversation panels can contain another contact's text and must not be used as evidence.
