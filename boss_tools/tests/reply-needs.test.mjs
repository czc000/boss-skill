import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReplyDrafts,
  classifyReplyNeed,
} from "../src/lib/reply-needs.mjs";

test("classifies interview scheduling prompts as safe template replies", () => {
  const result = classifyReplyNeed("方便什么时候线上会议面试和我们技术交流下吗");

  assert.deepEqual(result, {
    type: "interview-scheduling",
    safeToReply: true,
  });
});

test("classifies contact exchange prompts as safe template replies", () => {
  const result = classifyReplyNeed("我想要和您交换微信，您是否同意");

  assert.deepEqual(result, {
    type: "contact-exchange",
    safeToReply: true,
  });
});

test("classifies generic review follow-ups as safe template replies", () => {
  const result = classifyReplyNeed("请问什么时候能回复我呢");

  assert.deepEqual(result, {
    type: "generic-followup",
    safeToReply: true,
  });
});

test("classifies skill-fit questions as manual review only", () => {
  const result = classifyReplyNeed("参数化建模 曲面 拓扑 这种 擅长吗 主要用犀牛");

  assert.deepEqual(result, {
    type: "manual-review",
    safeToReply: false,
  });
});

test("classifies portfolio upload approval as manual review only", () => {
  const result = classifyReplyNeed("对方想发送作品集给您，您是否同意");

  assert.deepEqual(result, {
    type: "no-reply-needed",
    safeToReply: false,
  });
});

test("classifies raw resume or portfolio file uploads as no reply needed", () => {
  const result = classifyReplyNeed("孙悦-行政人事企培专员-5年经验-福田.pdf");

  assert.deepEqual(result, {
    type: "no-reply-needed",
    safeToReply: false,
  });
});

test("buildReplyDrafts returns multiple template options for safe interview prompts", () => {
  const drafts = buildReplyDrafts({
    name: "A",
    replySnippet: "方便什么时候线上会议面试和我们技术交流下吗",
  });

  assert.equal(drafts.type, "interview-scheduling");
  assert.equal(drafts.safeToReply, true);
  assert.equal(drafts.options.length, 3);
  assert.match(drafts.recommendedReply, /内部评估|合适的话/);
});

test("buildReplyDrafts does not generate reply options for manual-review prompts", () => {
  const drafts = buildReplyDrafts({
    name: "A",
    replySnippet: "参数化建模 曲面 拓扑 这种 擅长吗 主要用犀牛",
  });

  assert.deepEqual(drafts, {
    type: "manual-review",
    safeToReply: false,
    options: [],
    recommendedReply: "",
  });
});

test("buildReplyDrafts suppresses no-reply-needed snippets", () => {
  const drafts = buildReplyDrafts({
    name: "A",
    replySnippet: "对方想发送作品集给您，您是否同意",
  });

  assert.deepEqual(drafts, {
    type: "no-reply-needed",
    safeToReply: false,
    options: [],
    recommendedReply: "",
  });
});
