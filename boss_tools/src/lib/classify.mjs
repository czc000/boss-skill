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
const FLOW_PROGRESS_PATTERN = /(邀请对方面试|编辑面试邀请|请求交换微信已发送|请求交换电话已发送|已交换微信|已交换电话|已约面)/u;
const NO_REPLY_NEEDED_PATTERN =
  /(对方想发送作品集给您，您是否同意|点击预览附件简历|预览作品集|\.pdf$|\.doc$|\.docx$|这是我的简历|作品集)/iu;

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

function normalizeMessageItems(messageItems = []) {
  return messageItems
    .map((item) => ({
      role: String(item?.role || "").toLowerCase(),
      text: String(item?.text || "").trim(),
    }))
    .filter((item) => item.role && item.text);
}

function findReplySnippetAfterRequestInItems(messageItems = []) {
  const items = normalizeMessageItems(messageItems);
  let lastRequestIndex = -1;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const isRequestMarker = REQUEST_MARKERS.some((marker) => item.text.includes(marker));
    if (isRequestMarker && (item.role === "self" || item.role === "system")) {
      lastRequestIndex = i;
    }
  }

  if (lastRequestIndex < 0) {
    return null;
  }

  const tail = items.slice(lastRequestIndex + 1);
  const latestMeaningful = [...tail].reverse().find((item) =>
    item.role === "friend" || item.role === "self" || item.role === "system",
  );
  if (!latestMeaningful) {
    return null;
  }

  if (latestMeaningful.role === "system") {
    return FLOW_PROGRESS_PATTERN.test(latestMeaningful.text) ? null : null;
  }

  if (latestMeaningful.role === "self") {
    return null;
  }

  if (NO_REPLY_NEEDED_PATTERN.test(latestMeaningful.text)) {
    return null;
  }

  return FOLLOW_UP_PATTERN.test(latestMeaningful.text) ? latestMeaningful.text.slice(0, 120) : null;
}

function hasResumeRequestFromUs(messageItems = []) {
  const items = normalizeMessageItems(messageItems);
  return items.some((item) => {
    if (!(item.role === "self" || item.role === "system")) {
      return false;
    }
    return REQUEST_MARKERS.some((marker) => item.text.includes(marker));
  });
}

export function classifyConversationState({ friend, conversationText, visibleTexts = [], disabledTexts = [], messageItems = [] }) {
  if (friend?.isFiltered === true) {
    return { status: "skip", reason: "filtered" };
  }

  const convo = String(conversationText || "");
  const visible = visibleTexts.map((text) => String(text || ""));
  const disabled = disabledTexts.map((text) => String(text || ""));
  const normalizedItems = normalizeMessageItems(messageItems);

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
    const replySnippet =
      normalizedItems.length > 0
        ? findReplySnippetAfterRequestInItems(normalizedItems)
        : extractReplySnippetAfterRequest(convo);
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

  if (hasResumeRequestFromUs(normalizedItems) || alreadyRequestedByText) {
    const replySnippet =
      normalizedItems.length > 0
        ? findReplySnippetAfterRequestInItems(normalizedItems)
        : extractReplySnippetAfterRequest(convo);
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
