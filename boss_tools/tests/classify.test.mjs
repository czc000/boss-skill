import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyConversationState,
  shouldIncludeTodayContact,
} from "../src/lib/classify.mjs";
import { buildScanSummary } from "../src/lib/summary.mjs";

test("includes only same-day list rows with hh:mm lastTime", () => {
  assert.equal(shouldIncludeTodayContact({ lastTime: "19:21" }), true);
  assert.equal(shouldIncludeTodayContact({ lastTime: "刚刚" }), false);
  assert.equal(shouldIncludeTodayContact({ lastTime: "2026/4/8" }), false);
});

test("treats filtered contacts as filtered before any other logic", () => {
  const result = classifyConversationState({
    friend: { isFiltered: true, name: "A" },
    conversationText: "简历请求已发送",
    visibleTexts: [],
  });

  assert.deepEqual(result, {
    status: "skip",
    reason: "filtered",
  });
});

test("treats DOM resume request system text as already requested", () => {
  const result = classifyConversationState({
    friend: { isFiltered: false, name: "A" },
    conversationText: "15:13\n简历请求已发送\n",
    visibleTexts: [],
  });

  assert.deepEqual(result, {
    status: "skip",
    reason: "resume-already-requested",
  });
});

test("treats pending attachment approval as agree action", () => {
  const result = classifyConversationState({
    friend: { isFiltered: false, name: "A" },
    conversationText: "对方想发送附件简历给您，您是否同意",
    visibleTexts: ["同意"],
  });

  assert.deepEqual(result, {
    status: "act",
    reason: "pending-attachment-approval",
    action: "agree",
  });
});

test("treats disabled attachment approval button as already handled", () => {
  const result = classifyConversationState({
    friend: { isFiltered: false, name: "A" },
    conversationText: "对方想发送附件简历给您，您是否同意\n张三简历.pdf\n点击预览附件简历",
    visibleTexts: ["拒绝", "同意"],
    disabledTexts: ["同意"],
  });

  assert.deepEqual(result, {
    status: "skip",
    reason: "attachment-already-handled",
  });
});

test("treats recruiter acknowledgement of attachment receipt as already handled", () => {
  const result = classifyConversationState({
    friend: { isFiltered: false, name: "A" },
    conversationText: "对方想发送附件简历给您，您是否同意\n李四.pdf\n点击预览附件简历\n简历我们有收到了",
    visibleTexts: ["拒绝", "同意"],
  });

  assert.deepEqual(result, {
    status: "skip",
    reason: "attachment-already-handled",
  });
});

test("treats real conversation resume files as handled", () => {
  const result = classifyConversationState({
    friend: { isFiltered: false, name: "A" },
    conversationText: "张三简历.pdf",
    visibleTexts: [],
  });

  assert.deepEqual(result, {
    status: "skip",
    reason: "attachment-already-handled",
  });
});

test("does not treat profile resume labels as already handled", () => {
  const result = classifyConversationState({
    friend: { isFiltered: false, name: "A" },
    conversationText: "在线简历   附件简历",
    visibleTexts: [],
  });

  assert.deepEqual(result, {
    status: "act",
    reason: "request-resume",
    action: "request",
  });
});

test("does not treat another visible chat preview as already requested for the current contact", () => {
  const result = classifyConversationState({
    friend: { isFiltered: false, name: "A" },
    conversationText: "您好，我对岗位很感兴趣",
    visibleTexts: ["陈女士 方便先发一份最新简历给我吗？"],
  });

  assert.deepEqual(result, {
    status: "act",
    reason: "request-resume",
    action: "request",
  });
});

test("flags manual reply needed when candidate asks a follow-up after resume request", () => {
  const result = classifyConversationState({
    friend: { isFiltered: false, name: "A" },
    conversationText: "方便先发一份最新简历给我吗？\n好的，岗位具体是做什么的，薪资大概多少呢",
    visibleTexts: [],
  });

  assert.deepEqual(result, {
    status: "skip",
    reason: "needs-reply-after-request",
    action: "reply-manually",
    replySnippet: "好的，岗位具体是做什么的，薪资大概多少呢",
  });
});

test("falls back to request when nothing handled is present", () => {
  const result = classifyConversationState({
    friend: { isFiltered: false, name: "A" },
    conversationText: "您好，我对岗位很感兴趣",
    visibleTexts: ["求简历"],
  });

  assert.deepEqual(result, {
    status: "act",
    reason: "request-resume",
    action: "request",
  });
});

test("buildScanSummary reports manual reply reminders separately from already handled contacts", () => {
  const summary = buildScanSummary({
    totalToday: 5,
    filtered: [{ name: "A" }],
    remaining: [{ name: "B" }, { name: "C" }, { name: "D" }, { name: "E" }],
    skipped: [{ name: "B" }, { name: "C" }],
    actionable: [{ name: "D" }],
    needsReply: [{ name: "E" }],
    errors: [],
  });

  assert.deepEqual(summary, {
    total_today: 5,
    filtered_count: 1,
    remaining_count: 4,
    already_handled_count: 2,
    needs_action_count: 1,
    needs_reply_count: 1,
    error_count: 0,
  });
});
