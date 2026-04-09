import path from "node:path";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyConversationState, shouldIncludeTodayContact } from "../lib/classify.mjs";
import { REQUEST_TEXT } from "../lib/config.mjs";
import { RunLogger } from "../lib/logger.mjs";
import { BossPageSession, ensureOpenCliReady } from "../lib/opencli-boss-core.mjs";
import { buildScanSummary } from "../lib/summary.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

if (process.argv.includes("--help")) {
  console.log("Usage: node src/commands/scan-today.mjs");
  process.exit(0);
}

const logger = new RunLogger({ rootDir: ROOT });
const session = new BossPageSession({ logger });

const result = {
  filtered: [],
  remaining: [],
  skipped: [],
  actionable: [],
  needsReply: [],
  errors: [],
};

try {
  await ensureOpenCliReady();
  await session.navigateChat();
  const list = await session.fetchRawFriendList();
  const today = list.filter(shouldIncludeTodayContact);
  result.filtered = today.filter((friend) => friend.isFiltered === true).map((friend) => ({ name: friend.name, uid: friend.uid }));
  result.remaining = today.filter((friend) => friend.isFiltered !== true).map((friend) => ({ name: friend.name, uid: friend.uid, encryptUid: friend.encryptUid }));

  for (const friend of today.filter((item) => item.isFiltered !== true)) {
    try {
      await session.openChatByUid(friend.uid);
      const dom = await session.readConversationDom();
      const verdict = classifyConversationState({
        friend,
        conversationText: dom.conversationText,
        visibleTexts: dom.visibleTexts,
        disabledTexts: dom.disabledTexts,
        requestText: REQUEST_TEXT,
      });
      logger.event({
        step: "scan-contact",
        candidate: friend.name,
        uid: friend.uid,
        tabId: session.tabId,
        href: dom.href,
        action: "classify",
        result: verdict.status,
        reason: verdict.reason,
      });
      if (verdict.status === "skip") {
        if (verdict.reason === "needs-reply-after-request") {
          result.needsReply.push({
            name: friend.name,
            uid: friend.uid,
            reason: verdict.reason,
            replySnippet: verdict.replySnippet || "",
          });
        } else {
          result.skipped.push({ name: friend.name, uid: friend.uid, reason: verdict.reason });
        }
      } else {
        result.actionable.push({ name: friend.name, uid: friend.uid, reason: verdict.reason, action: verdict.action });
      }
    } catch (error) {
      result.errors.push({ name: friend.name, uid: friend.uid, error: String(error.message || error) });
      logger.event({
        step: "scan-contact",
        candidate: friend.name,
        uid: friend.uid,
        tabId: session.tabId,
        action: "classify",
        result: "error",
        reason: String(error.message || error),
      });
    }
  }

  const summary = {
    summary: buildScanSummary({
      totalToday: today.length,
      filtered: result.filtered,
      remaining: result.remaining,
      skipped: result.skipped,
      actionable: result.actionable,
      needsReply: result.needsReply,
      errors: result.errors,
    }),
    filtered: result.filtered,
    actionable: result.actionable,
    needs_reply: result.needsReply,
    skipped: result.skipped,
    errors: result.errors,
  };
  const summaryFile = logger.saveSummary(summary);
  console.log(JSON.stringify({ summaryFile, ...summary.summary }, null, 2));
} catch (error) {
  const summaryFile = logger.saveSummary({
    status: "error",
    error: String(error.message || error),
  });
  console.error(JSON.stringify({ summaryFile, error: String(error.message || error) }, null, 2));
  process.exit(1);
}
