import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReplyDrafts } from "../lib/reply-needs.mjs";
import { classifyConversationState, shouldIncludeTodayContact } from "../lib/classify.mjs";
import { RunLogger } from "../lib/logger.mjs";
import { BossPageSession, ensureOpenCliReady } from "../lib/opencli-boss-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function usage() {
  console.log("Usage:");
  console.log("  node src/commands/reply-needs.mjs draft");
  console.log("  node src/commands/reply-needs.mjs send --plan-file /path/to/reply-plan.json");
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function buildConversationExcerpt(conversationText) {
  const lines = String(conversationText || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(-12).join("\n");
}

async function draftNeedsReplies() {
  const logger = new RunLogger({ rootDir: ROOT });
  const session = new BossPageSession({ logger });
  const result = {
    draftable: [],
    manualReview: [],
    errors: [],
  };

  await ensureOpenCliReady();
  await session.navigateChat();
  const list = await session.fetchRawFriendList();
  const today = list.filter(shouldIncludeTodayContact).filter((friend) => friend.isFiltered !== true);

  for (const friend of today) {
    try {
      await session.openChatByUid(friend.uid);
      const dom = await session.readConversationDom();
      const verdict = classifyConversationState({
        friend,
        conversationText: dom.conversationText,
        messageItems: dom.messageItems,
        visibleTexts: dom.visibleTexts,
        disabledTexts: dom.disabledTexts,
      });

      if (verdict.reason !== "needs-reply-after-request") {
        continue;
      }

      const drafts = buildReplyDrafts({
        name: friend.name,
        replySnippet: verdict.replySnippet || "",
      });
      const item = {
        name: friend.name,
        uid: friend.uid,
        reason: verdict.reason,
        replySnippet: verdict.replySnippet || "",
        conversationExcerpt: buildConversationExcerpt(dom.conversationText),
        ...drafts,
      };

      if (drafts.safeToReply) {
        result.draftable.push(item);
      } else {
        result.manualReview.push(item);
      }
    } catch (error) {
      result.errors.push({ name: friend.name, uid: friend.uid, error: String(error.message || error) });
    }
  }

  const summary = {
    mode: "draft",
    total_needs_reply: result.draftable.length + result.manualReview.length,
    draftable_count: result.draftable.length,
    manual_review_count: result.manualReview.length,
    error_count: result.errors.length,
    draftable: result.draftable,
    manual_review: result.manualReview,
    errors: result.errors,
  };
  const summaryFile = logger.saveSummary(summary);
  console.log(JSON.stringify({ summaryFile, ...summary }, null, 2));
}

async function sendReplies(planFile) {
  if (!planFile) {
    throw new Error("missing --plan-file");
  }

  const logger = new RunLogger({ rootDir: ROOT });
  const session = new BossPageSession({ logger });
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  const items = Array.isArray(plan?.items) ? plan.items : [];
  const result = {
    sent: [],
    skipped: [],
    errors: [],
  };

  await ensureOpenCliReady();
  await session.navigateChat();

  for (const item of items) {
    try {
      if (item?.send !== true) {
        result.skipped.push({
          name: item?.name || "",
          uid: item?.uid || "",
          reason: "not-selected",
        });
        continue;
      }

      const reply = String(item?.reply || "").trim();
      if (!reply) {
        result.skipped.push({
          name: item?.name || "",
          uid: item?.uid || "",
          reason: "empty-reply",
        });
        continue;
      }

      await session.openChatByUid(item.uid);
      const send = await session.sendMessage(reply);
      const dom = await session.readConversationDom();
      if (!send.ok || !dom.conversationText.includes(reply)) {
        throw new Error(`send-failed:${JSON.stringify({ send })}`);
      }

      result.sent.push({
        name: item.name,
        uid: item.uid,
        reply,
      });
      logger.event({
        step: "reply-needs-send",
        candidate: item.name,
        uid: item.uid,
        tabId: session.tabId,
        href: dom.href,
        action: "send-reply",
        result: "ok",
      });
    } catch (error) {
      result.errors.push({
        name: item?.name || "",
        uid: item?.uid || "",
        error: String(error.message || error),
      });
      logger.event({
        step: "reply-needs-send",
        candidate: item?.name || "",
        uid: item?.uid || "",
        tabId: session.tabId,
        action: "error",
        result: "error",
        reason: String(error.message || error),
      });
    }
  }

  const summary = {
    mode: "send",
    sent_count: result.sent.length,
    skipped_count: result.skipped.length,
    error_count: result.errors.length,
    sent: result.sent,
    skipped: result.skipped,
    errors: result.errors,
  };
  const summaryFile = logger.saveSummary(summary);
  console.log(JSON.stringify({ summaryFile, ...summary }, null, 2));
}

const subcommand = process.argv[2];

if (!subcommand || process.argv.includes("--help")) {
  usage();
  process.exit(subcommand ? 0 : 1);
}

if (subcommand === "draft") {
  await draftNeedsReplies();
} else if (subcommand === "send") {
  await sendReplies(readArg("--plan-file"));
} else {
  usage();
  process.exit(1);
}
