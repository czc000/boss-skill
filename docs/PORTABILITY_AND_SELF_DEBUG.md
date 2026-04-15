# Portability And Self-Debug

This note is for cases where the workflow logic is still conceptually correct, but the project breaks because the local machine, `opencli`, or the BOSS page structure differs from the environment the repo was originally developed against.

This is especially relevant when:

- running on Windows for the first time
- using a newer or older `opencli` build
- seeing a different BOSS chat DOM structure
- hitting lazy-loading or timing behavior that was not visible on another machine

## Root Cause Model

Most portability failures in this project fall into one of four buckets:

1. API drift
2. DOM drift
3. timing / lazy-load drift
4. error containment not strict enough

The important point is:

- these failures usually do **not** mean the recruiter workflow is wrong
- they usually mean one implementation assumption is too rigid for the current environment

## 1. `opencli` Return Shape Drift

### Typical symptom

- `navigate did not return tabId`

### What it usually means

The current machine's `opencli` build returns a different navigation identifier shape than the code expects. A common example is:

- repo expects: `tabId`
- local runtime returns: `page`

This is usually an `opencli` compatibility issue, not a Windows-only issue.

### Files to inspect

- `boss_tools/src/lib/opencli-daemon.mjs`
- `boss_tools/src/lib/opencli-boss-core.mjs`

### Safe fix direction

- normalize the daemon response in one place
- accept `tabId ?? page` when binding the controlled page
- avoid scattering transport-specific assumptions into business logic

### Better long-term rule

Introduce one internal page reference abstraction and keep all daemon compatibility logic behind it.

## 2. Chat List DOM Drift

### Typical symptoms

- `missing-user-list`
- `chat-row-not-found`
- code only works when legacy `.user-list` exists

### What it usually means

The current BOSS page is using a different container structure than the one the repo hard-coded. This can happen because of:

- front-end rollout changes
- A/B variants
- browser or viewport differences
- accessibility / role-based markup changes

This is mainly a page-structure assumption problem, not a Windows-only issue.

### Files to inspect

- `boss_tools/src/lib/opencli-boss-core.mjs`
- `boss_tools/src/lib/chat-ui-state.mjs`

### Safe fix direction

- do not hard-code only `.user-list`
- infer the real chat list container from multiple signals:
  - `class`
  - `role`
  - scrollability
  - row count
  - row id pattern
- keep the selection logic in shared helpers instead of duplicating it inside commands

### Better long-term rule

Treat DOM lookup as heuristic detection, not exact selector matching.

## 3. Scroll Budget / Timing Drift

### Typical symptoms

- contact exists in the list but still becomes `chat-row-not-found`
- failures happen more often on large lists or slower lazy-loading
- rerunning sometimes works without code changes

### What it usually means

The list is lazy-loaded or rendered slower than the original implementation assumed.

This can be affected by:

- machine performance
- browser performance
- extension timing
- network latency
- long chat lists

Windows can make this easier to hit, but the real issue is that the retry budget is too small.

### Files to inspect

- `boss_tools/src/lib/opencli-boss-core.mjs`

### Safe fix direction

- increase scroll attempts
- separate “cannot scroll anymore” from “not found yet”
- wait for row activation after switching chats
- prefer configurable retry budgets over hard-coded small constants

### Better long-term rule

Anything that depends on lazy-loaded UI should expose tunable retry limits and backoff.

## 4. Process Flow Too Eager After Side Effects

### Typical symptoms

- script sends the recruiter message, then still clicks `求简历 -> 确定` even though state already changed
- clicking `同意` actually worked, but the script still reports failure
- one broken page state turns into a large `error_count`

### What it usually means

The action sequence is assuming the page state will stay in the same category after a side effect. That is too optimistic.

The business logic is often still fine; what is missing is:

- immediate re-read
- immediate re-classification
- fatal-context detection

### Files to inspect

- `boss_tools/src/commands/process-today.mjs`
- `boss_tools/src/commands/scan-today.mjs`
- `boss_tools/src/commands/reply-needs.mjs`

### Safe fix direction

- after every side effect, re-read DOM and re-classify
- after `sendMessage`, do not assume the next step is still `request-resume`
- after `click 同意`, treat “no longer pending” as success instead of requiring one exact text disappearance
- stop the whole batch on fatal context problems such as:
  - left chat page
  - daemon unavailable
  - extension disconnected
  - chat-list container missing

### Better long-term rule

Use state transition validation, not fixed text expectations.

## Environment vs Project: How To Judge

Use this rule of thumb:

- if the workflow category is still right but a selector, field, or return shape changed, it is an environment-compatibility issue
- if a side effect changes the page state and the script keeps acting as if nothing changed, it is a project robustness issue

In practice, most failures are mixed:

- environment drift exposes
- project assumptions that are too brittle

## Self-Debug Checklist

When you hit a similar issue again, check in this order:

1. Is the daemon alive and extension connected?
2. Does `opencli` still return the same shape as the code expects?
3. Does the chat list container still match the selector assumptions?
4. Is the contact actually present but hidden behind lazy loading?
5. After the last side effect, did the conversation state already change category?
6. Is this a local per-contact failure or a fatal page-context failure that should stop the batch?

## Preferred Fix Principles

- Normalize transport differences once.
- Detect DOM structures heuristically.
- Re-classify after each side effect.
- Fail closed on fatal context drift.
- Use larger or configurable retry budgets for lazy-loaded UI.
- Keep tests for known drift patterns so the next machine does not rediscover the same issue.

## Good Candidate Tests To Add

- daemon navigate response supports `tabId`
- daemon navigate response supports `page`
- chat list container can be found without legacy `.user-list`
- long lazy-loaded lists do not fail early with small scroll budgets
- `process-today` re-classifies immediately after `sendMessage`
- `agree` succeeds when the chat is no longer in `pending-attachment-approval` even if one exact string still appears elsewhere

## Practical Summary

If the project suddenly fails on a new machine, do **not** assume the recruiter workflow needs redesign first.

Check these first:

- `opencli` response shape
- actual BOSS chat DOM
- lazy-loading / timing budget
- whether the command should have re-classified before continuing
