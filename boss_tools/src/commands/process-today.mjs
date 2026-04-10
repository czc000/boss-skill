import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyConversationState, shouldIncludeTodayContact } from "../lib/classify.mjs";
import { REQUEST_TEXT } from "../lib/config.mjs";
import { RunLogger } from "../lib/logger.mjs";
import { BossPageSession, ensureOpenCliReady } from "../lib/opencli-boss-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

if (process.argv.includes("--help")) {
  console.log("Usage: node src/commands/process-today.mjs");
  process.exit(0);
}

const logger = new RunLogger({ rootDir: ROOT });
const session = new BossPageSession({ logger });

const results = {
  agreed: [],
  requested: [],
  skipped: [],
  needsReply: [],
  errors: [],
};

try {
  await ensureOpenCliReady();
  await session.navigateChat();
  const list = await session.fetchRawFriendList();
  const today = list.filter(shouldIncludeTodayContact).filter((friend) => friend.isFiltered !== true);

  for (const friend of today) {
    try {
      await session.openChatByUid(friend.uid);
      let dom = await session.readConversationDom();
      let verdict = classifyConversationState({
        friend,
        conversationText: dom.conversationText,
        messageItems: dom.messageItems,
        visibleTexts: dom.visibleTexts,
        disabledTexts: dom.disabledTexts,
        requestText: REQUEST_TEXT,
      });

      if (verdict.status === "skip") {
        if (verdict.reason === "needs-reply-after-request") {
          results.needsReply.push({
            name: friend.name,
            uid: friend.uid,
            reason: verdict.reason,
            replySnippet: verdict.replySnippet || "",
          });
        } else {
          results.skipped.push({ name: friend.name, uid: friend.uid, reason: verdict.reason });
        }
        logger.event({
          step: "process-contact",
          candidate: friend.name,
          uid: friend.uid,
          tabId: session.tabId,
          href: dom.href,
          action: verdict.reason === "needs-reply-after-request" ? "needs-reply" : "skip",
          result: "ok",
          reason: verdict.reason,
        });
        continue;
      }

      if (verdict.action === "agree") {
        const agree = await session.clickExactText("同意");
        dom = await session.readConversationDom();
        if (!agree.clicked || dom.conversationText.includes("对方想发送附件简历给您，您是否同意")) {
          throw new Error(`agree-failed:${JSON.stringify({ agree })}`);
        }
        results.agreed.push({ name: friend.name, uid: friend.uid });
        logger.event({
          step: "process-contact",
          candidate: friend.name,
          uid: friend.uid,
          tabId: session.tabId,
          href: dom.href,
          action: "agree",
          result: "ok",
        });
        continue;
      }

      if (!dom.conversationText.includes(REQUEST_TEXT)) {
        const send = await session.sendMessage(REQUEST_TEXT);
        dom = await session.readConversationDom();
        if (!send.ok || !dom.conversationText.includes(REQUEST_TEXT)) {
          throw new Error(`send-failed:${JSON.stringify({ send })}`);
        }
      }

      const request = await session.clickExactText("求简历");
      const confirm = await session.clickExactText("确定");
      dom = await session.readConversationDom();
      verdict = classifyConversationState({
        friend,
        conversationText: dom.conversationText,
        messageItems: dom.messageItems,
        visibleTexts: dom.visibleTexts,
        disabledTexts: dom.disabledTexts,
        requestText: REQUEST_TEXT,
      });

      if (!request.clicked || !confirm.clicked || !dom.conversationText.includes("简历请求已发送")) {
        throw new Error(`request-failed:${JSON.stringify({ request, confirm })}`);
      }

      results.requested.push({ name: friend.name, uid: friend.uid });
      logger.event({
        step: "process-contact",
        candidate: friend.name,
        uid: friend.uid,
        tabId: session.tabId,
        href: dom.href,
        action: "request-resume",
        result: "ok",
      });
    } catch (error) {
      results.errors.push({ name: friend.name, uid: friend.uid, error: String(error.message || error) });
      logger.event({
        step: "process-contact",
        candidate: friend.name,
        uid: friend.uid,
        tabId: session.tabId,
        action: "error",
        result: "error",
        reason: String(error.message || error),
      });
      break;
    }
  }

  const summary = {
    processed_count: results.agreed.length + results.requested.length + results.skipped.length + results.needsReply.length,
    unprocessed_count: results.errors.length,
    agreed_count: results.agreed.length,
    requested_count: results.requested.length,
    skipped_count: results.skipped.length,
    needs_reply_count: results.needsReply.length,
    error_count: results.errors.length,
    agreed: results.agreed,
    requested: results.requested,
    needs_reply: results.needsReply,
    skipped: results.skipped,
    errors: results.errors,
  };

  const summaryFile = logger.saveSummary(summary);
  console.log(JSON.stringify({ summaryFile, ...summary }, null, 2));
} catch (error) {
  const summaryFile = logger.saveSummary({
    status: "error",
    error: String(error.message || error),
  });
  console.error(JSON.stringify({ summaryFile, error: String(error.message || error) }, null, 2));
  process.exit(1);
}
