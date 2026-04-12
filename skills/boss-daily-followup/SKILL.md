---
name: boss-daily-followup
description: Use when handling BOSS Zhipin recruiter conversations from a specific day, especially to review chats, skip filtered candidates, approve pending attachment resumes, or request resumes without duplicating prior actions.
---

# BOSS Daily Follow-Up

Back this skill with:

- `__BOSS_SKILL_ROOT__/memory/boss-operational-constraints.md`
- `__BOSS_SKILL_ROOT__/memory/boss-lessons-learned.md`

Run:

  ```bash
  # Run on the host environment, not inside a sandboxed network namespace.
  opencli doctor
  ```

Check it like this:

- Only trust `opencli doctor` from the host environment that can see the real Chrome extension.
- Do not trust a sandbox-local `opencli doctor` result for BOSS session safety checks.
- `No daemon connected` before the first real `opencli` command can be normal.
- A minimal host-side read such as `opencli boss chatlist --limit 1 -f json` can bootstrap the daemon/extension path.
- If a real host-side `opencli boss ...` read command succeeds, treat that as stronger evidence than a stale `doctor` result.
- Continue only if host `opencli doctor` shows `Extension connected`.
- If `opencli doctor` and the visible browser state disagree, verify daemon state directly:

  ```bash
  curl -H 'X-OpenCLI: 1' http://127.0.0.1:19825/status
  ```

- Treat `extensionConnected: true` from the host daemon as the authoritative fallback signal.
- If neither the host `opencli doctor` nor host `/status` confirms the extension is connected, stop immediately.
- If the processing script fails with `opencli daemon is not running`, first bootstrap with one minimal `opencli boss` read command, then rerun the script.

## Hard Constraints

- Preserving the logged-in BOSS session is the top priority. It is more important than finishing the task batch.
- Never run parallel actions against BOSS chats.
- Avoid repeated navigation back to the chat page.
  - Avoid repeating `click-chat` / `goto` / reopening the chat page for every contact.
  - Prefer one stable chat tab/session, then process contacts serially inside that tab.
- If bridge/login state looks abnormal, stop immediately.
- Once a stable logged-in chat tab is chosen, bind to that one tab and do not switch to another tab/workspace mid-run.
- Page-level actions must stay on one verified `tabId`. Do not assume workspace reuse preserves the active chat tab across separate commands.

## Absolutely Forbidden

  The following are hard failures, not "fallback strategies":

- Do not trade login/session safety for task completion.
- Do not mix multiple control chains in one run.
- Do not mix:
    - `opencli boss send`
    - `opencli boss-extra goto`
    - `opencli boss-extra click-chat`
    - `opencli boss-extra exec`
    - raw daemon-client `navigate`
    - raw daemon-client `exec`
  - Do not use one chain to inspect and a different chain to act on the same contact batch.
  - If page actions are needed, pick one chain and finish the whole batch inside it.
  - Do not do recovery probing by opening chat again and again.
  - Do not create or control multiple automation tabs for the same BOSS task.
  - Do not bounce between workspaces/tabs trying to find a "working" page.
  - Do not continue if the controlled page lands on:
    - BOSS homepage
    - `https://www.zhipin.com/web/user/?ka=bticket`
    - any login / invalid-session / ticket page
  - If any of the above happens, stop immediately and report the failure mode.

## Tools To Use

Read state first, and prefer the lightest path:

- Preferred reusable toolchain for agent runs:
  - `__BOSS_SKILL_ROOT__/boss_tools/src/commands/scan-today.mjs`
  - `__BOSS_SKILL_ROOT__/boss_tools/src/commands/process-today.mjs`
  - `__BOSS_SKILL_ROOT__/boss_tools/src/commands/reply-needs.mjs`
  - use these first instead of rewriting ad-hoc one-off scripts
  - after running them, read the generated summary/log files and report the results to the user
  - if they fail, debug from their structured logs before inventing a new workflow

  opencli boss chatlist --limit 120 -f json
  opencli boss chatmsg <uid> -f json

  Preferred read strategy:

  - first read the chat/friend list
  - first filter out `isFiltered = true` contacts from the list layer
  - only inspect conversation history for the remaining unfiltered contacts
  - only open the page UI for contacts that truly need an action

  Important validated caveat:

  - current `opencli boss chatlist -f json` does not expose `isFiltered`
  - if list-layer filtering is required, fetch the raw friend list from the chat page API:
    - `/wapi/zprelation/friend/getBossFriendListV2.json?page=1&status=0&jobId=0`
  - do not pretend the truncated CLI output is enough for filtering
  - the reusable `boss_tools` scripts already implement this raw friend-list path; prefer them

  Only if UI action is necessary, open a chat in the current stable page:

  opencli boss-extra click-chat "<name>"

  Click buttons:

  opencli boss-extra click "同意"
  opencli boss-extra click "求简历"
  opencli boss-extra click "确定"

  Send normal text:

  opencli boss send <uid> "你好，感谢你的关注，方便先发一份最新简历给我吗？"

  Important:

  - `opencli boss send` re-navigates to the chat page. Do not use it in a loop for many contacts.
  - For existing chat contacts, prefer one already-open chat page plus page-level JS typing/sending.
  - If the current page shows the chat editor but the button is disabled, send the message first and verify it appears in the conversation before clicking `求简历` or `同意`.
  - If a stable logged-in tab has already been bound, do not call any command that implicitly rebinds navigation context.
  - `boss-extra` commands may succeed while a later command reads a different tab. If that happens, stop trusting workspace-only continuity and switch to a single raw daemon-client chain with an explicit `tabId`.
  - When switching chats, do not trust a fixed sleep alone. Confirm the target contact row is actually active before using the current chat DOM as evidence.
  - Read only the visible current conversation panel. Do not use hidden panels, stale panels, or whole-page visible text as proof for the current contact state.

  Preferred stable page-action path, if you need UI actions:

  1. first prefer `__BOSS_SKILL_ROOT__/boss_tools/src/commands/process-today.mjs`
  2. if you must do page actions manually, use raw daemon-client `navigate` to `https://www.zhipin.com/web/chat/index`
  3. capture returned `tabId`
  4. use the same `tabId` for all later `exec` calls in this run
  5. confirm `location.href` is still `/web/chat/index` before each contact action
  6. do not drop back to workspace-only page commands after that

  If `boss send` fails for an existing chat contact:

  - do not immediately fall back to a different control chain
  - first verify whether the current bound tab is still the same logged-in chat tab
  - if not, stop and report
  - only continue if you can prove the same bound tab is still active

  ## Exact Decision Order

  For each contact on the target date, do these checks in this exact order:

  1. Read the day/contact list
  2. Filter out any `isFiltered = true` contacts immediately
  3. Only for unfiltered contacts, inspect the conversation
  4. Did we already ask for a resume?
  5. Is there a pending attachment-resume approval that is not yet handled?
  6. Has an attachment resume already been accepted/handled?
  7. If none of the above, send text first, verify it appears, then click 求简历 + click 确定.
  8. If the summary shows `needs_reply_count > 0`, draft replies with `reply-needs.mjs draft` before sending anything manual.

  Important:

  - Do not inspect every contact conversation before checking the list-layer filter.
  - List-layer filtering is the fast path and should eliminate most contacts early.
  - Page UI is the last step, not the primary source of truth.
  - But for `简历请求已发送`, the page DOM is more reliable than `chatmsg` alone.

  ## How To Detect States

  ### State A: Filtered candidate

  If the contact is filtered for any reason at the list layer

  - Action: skip
  - Do not continue to resume logic
  - Do not special-case 经历不符 vs 学历不符 vs 年龄不符
  - Do not fetch the full conversation for this contact unless there is a very specific need to prove a bug in the list data

  ### State B: Resume already requested

  If conversation contains any of:

  - 方便先发一份最新简历给我吗
  - 方便发一份
  - 请问可以发一份
  - 简历请求已发送
  - raw recruiter action `aid = 37`

  Validated priority:

  - if the current chat DOM shows `简历请求已发送`, trust that and skip
  - only trust evidence from the current active conversation body / current active chat DOM
  - do not treat side-list previews, whole-page visible text, or another contact's visible request text as proof
  - do not rely on `chatmsg` alone to disprove this state
  - `historyMsg` can miss page-visible system messages

  Action:

  - skip

  ### State C: Pending attachment resume needs approval

  If conversation contains:

  - 对方想发送附件简历给您，您是否同意
  - and this dialog is not already operated

  Important:

  - If raw dialog state shows `operated: true`, do not treat it as pending.
  - If the `同意` button is disabled or inert on the current page, send a short recruiter message first, verify it appears, then click `同意`.

  Action:

  opencli boss-extra click "同意"

  Then re-check conversation.

  ### State D: Attachment resume already accepted/handled

  If conversation contains any of:

  - 简历.pdf
  - 简历.doc
  - 简历.docx
  - clear accepted attachment-file state
  - handled/accepted attachment-resume system state

  Action:

  - skip

  Important:

  - do not treat profile-side `在线简历` / `附件简历` labels as proof that the chat is already handled
  - only treat actual conversation/file/system evidence as handled

  ### State E: Online resume card only

  If conversation only contains things like:

  - 点击查看牛人简历
  - 在线简历
  - `body.resume`

  Then:

  - do not treat this as already handled
  - continue checking whether we already requested the resume
  - if we did not request it yet, this still needs processing

  ### State F: No resume request yet and not otherwise handled

  Action order:

  1. Send text first:

  你好，感谢你的关注，方便先发一份最新简历给我吗？

  2. Verify the text appears in the conversation or list preview

  3. Click:

  opencli boss-extra click "求简历"
  opencli boss-extra click "确定"

  4. Re-check conversation and confirm recruiter request state

  Validated send path:

  - editor: `#boss-chat-editor-input`
  - send button: `.submit-content .submit`
  - reliable JS sequence:
    - focus editor
    - move selection to end
    - `document.execCommand('insertText', false, text)`
    - dispatch `input`, `change`, `keyup`
    - dispatch `mousedown`, `mouseup`, `click` on the send button

  Validated button path:

  - `求简历`: exact visible text match, often class `operate-btn`
  - `确定`: exact visible text match, often class `boss-btn-primary boss-btn`
  - `同意`: exact visible text match
  - click via exact-text node + `mousedown`, `mouseup`, `click`

## Reply Workflow

If the current batch surfaces candidate follow-up questions after we already requested a resume:

1. Run `__BOSS_SKILL_ROOT__/boss_tools/src/commands/reply-needs.mjs draft`
2. Review the generated plan
3. Only send replies that are clearly safe template cases
4. Keep technical-fit, portfolio, compensation, or role-detail questions in manual review

## Verification Rules

  Never trust the page alone. After each action, verify with fresh conversation state.

  Efficiency rule:

  - list layer for broad filtering
  - conversation layer for state confirmation
  - page layer only for actual actions

  Verified hierarchy for this site:

  - list layer decides filtered vs not filtered
  - page DOM is the best source for:
    - current chat tab continuity
    - `简历请求已发送`
    - visible `求简历` / `确定` / `同意`
    - whether the just-sent message actually appeared
  - `chatmsg` is supplemental only and can miss DOM-visible system state

  Strong evidence of success:

  - recruiter message appears in conversation
  - recruiter resume-request action exists (`aid = 37`)
  - attachment-approval dialog becomes handled (`operated: true`) or equivalent handled system state appears
  - current chat DOM shows `简历请求已发送`

  Strong evidence that the run is no longer safe and must stop:

  - controlled tab URL changes away from the intended chat page on the same bound `tabId`
  - controlled tab lands on homepage
  - controlled tab lands on `bticket`
  - bridge/extension reconnects into a different workspace/tab unexpectedly
  - page automation succeeds visually but raw conversation state does not change

  ## Required Output Format

  After processing, report counts first, then details.

  ### Summary

  - processed-count: how many contacts are already handled after this run
  - unprocessed-count: how many contacts still need action after this run
  - filtered-count: how many contacts were skipped because they were filtered
  - stop-reason: if the run was stopped to protect the session, state it explicitly

  Important:

  - Summary must appear before any name list.
  - If session safety and task completion conflict, protect the session and report the remaining unprocessed count.

  Then report in 3 groups:

  ### Agreed Resume

  - names where 同意 was clicked

  ### Requested Resume

  - names where text was sent and 求简历 was clicked

  ### Skipped

  - name + reason
  - allowed reasons:
      - filtered
      - chat-not-openable
      - attachment-already-handled
      - resume-already-requested
      - bridge-disconnected

  ## Do Not Do These

  - Do not guess hidden state from list summary alone.
  - Do not waste time opening or inspecting filtered contacts one by one.
  - Do not treat online resume cards as already handled.
  - Do not repeat resume requests.
  - Do not force-open hidden contacts.
  - Do not use greet for existing chat contacts.
  - Do not treat 待同意发送简历 as 已处理.
  - Do not keep navigating back to chat for every single contact.
  - Do not click 求简历 before the recruiter message has actually appeared in chat.
  - Do not mix `boss send`, `boss-extra`, and raw daemon navigation in the same run.
  - Do not try to "recover" by opening more tabs or re-running navigation probes.
  - Do not continue after homepage / `bticket` / login-page redirects.
  - Do not continue if extension is disconnected.
  - Do not prioritize "finishing today's batch" over preserving the logged-in session.
  - Do not assume separate `boss-extra` commands are still bound to the same chat tab without a verified `tabId`.
  - Do not trust `chatmsg` page 1 as the sole truth for “already handled”.

  ## Minimal Example

  For one contact:

  1. opencli boss chatmsg <uid> -f json
  2. If filtered: skip
  3. Else if resume already requested (`aid=37` or recruiter text exists): skip
  4. Else if pending attachment approval exists and is not handled: click 同意, then re-check
  5. Else if attachment resume already handled: skip
  6. Else:
      - send text
      - verify text appears
      - click 求简历
      - click 确定
      - re-check for recruiter request state
