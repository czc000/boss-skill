const HH_MM_PATTERN = /^\d{1,2}:\d{2}$/;
const REQUEST_MARKERS = [
  "简历请求已发送",
  "方便先发一份最新简历给我吗",
  "方便发一份",
  "请问可以发一份",
];
const TIMESTAMP_PATTERN = /^\d{1,2}:\d{2}$/;
const FOLLOW_UP_PATTERN =
  /(\?|？|薪资|待遇|岗位|职责|双休|单休|大小周|五险一金|上班|地址|面试|到岗|多久回复|方便介绍|介绍一下|还招|怎么安排|何时|什么时候|可以吗|是否|在吗|年龄|经验|学历|技术栈|做什么|呢[，。？！]?|吗[，。？！]?)/u;

export function shouldIncludeTodayContact(friend) {
  return HH_MM_PATTERN.test(String(friend?.lastTime || ""));
}

function extractReplySnippetAfterRequest(conversationText) {
  const convo = String(conversationText || "");
  let markerIndex = -1;
  let markerText = "";

  for (const marker of REQUEST_MARKERS) {
    const index = convo.lastIndexOf(marker);
    if (index > markerIndex) {
      markerIndex = index;
      markerText = marker;
    }
  }

  if (markerIndex < 0) {
    return null;
  }

  const tail = convo.slice(markerIndex + markerText.length).replace(/^[\s，。？！!?：:;；]+/u, "");
  const lines = tail
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !TIMESTAMP_PATTERN.test(line))
    .filter((line) => !REQUEST_MARKERS.some((marker) => line.includes(marker)));

  const matchingLine = lines.find((line) => FOLLOW_UP_PATTERN.test(line));
  if (matchingLine) {
    return matchingLine;
  }

  const normalizedTail = tail.replace(/\s+/g, " ").trim();
  if (normalizedTail && FOLLOW_UP_PATTERN.test(normalizedTail)) {
    return normalizedTail.slice(0, 120);
  }

  return null;
}

export function classifyConversationState({ friend, conversationText, visibleTexts = [], disabledTexts = [] }) {
  if (friend?.isFiltered === true) {
    return { status: "skip", reason: "filtered" };
  }

  const convo = String(conversationText || "");
  const visible = visibleTexts.map((text) => String(text || ""));
  const disabled = disabledTexts.map((text) => String(text || ""));

  const attachmentHandledByAck =
    convo.includes("简历我们有收到了") ||
    convo.includes("简历已收到") ||
    convo.includes("已收到简历");

  const attachmentApprovalAlreadyClosed =
    convo.includes("对方想发送附件简历给您，您是否同意") &&
    disabled.includes("同意");

  if (attachmentHandledByAck || attachmentApprovalAlreadyClosed) {
    return {
      status: "skip",
      reason: "attachment-already-handled",
    };
  }

  if (convo.includes("对方想发送附件简历给您，您是否同意")) {
    return {
      status: "act",
      reason: "pending-attachment-approval",
      action: "agree",
    };
  }

  if (convo.includes("简历请求已发送")) {
    const replySnippet = extractReplySnippetAfterRequest(convo);
    if (replySnippet) {
      return {
        status: "skip",
        reason: "needs-reply-after-request",
        action: "reply-manually",
        replySnippet,
      };
    }
    return {
      status: "skip",
      reason: "resume-already-requested",
    };
  }

  if (/(简历\.pdf|简历\.docx?|个人简历\.pdf|点击查看牛人简历|在线简历)/i.test(convo)) {
    const onlyProfileLabels = /^\s*(在线简历\s*附件简历|附件简历\s*在线简历|在线简历|附件简历)\s*$/u.test(
      convo.replace(/\s+/g, " ").trim(),
    );
    if (!onlyProfileLabels) {
      return {
        status: "skip",
        reason: "attachment-already-handled",
      };
    }
  }

  const alreadyRequestedByText =
    convo.includes("方便先发一份最新简历给我吗") ||
    convo.includes("方便发一份") ||
    convo.includes("请问可以发一份");

  if (alreadyRequestedByText) {
    const replySnippet = extractReplySnippetAfterRequest(convo);
    if (replySnippet) {
      return {
        status: "skip",
        reason: "needs-reply-after-request",
        action: "reply-manually",
        replySnippet,
      };
    }
    return {
      status: "skip",
      reason: "resume-already-requested",
    };
  }

  return {
    status: "act",
    reason: "request-resume",
    action: "request",
  };
}
