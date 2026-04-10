const INTERVIEW_PATTERN = /(面试|线上会议|线上沟通|技术交流|约个时间|什么时候.*(面试|交流|沟通))/u;
const CONTACT_EXCHANGE_PATTERN = /(微信|联系方式|交换微信|加微|加你微信|联系你)/u;
const GENERIC_FOLLOWUP_PATTERN = /(什么时候回复|何时回复|何时安排|多久回复|麻烦回复|有消息吗|能回复我|后续安排)/u;
const NO_REPLY_NEEDED_PATTERN =
  /(对方想发送作品集给您，您是否同意|点击预览附件简历|预览作品集|\.pdf$|\.doc$|\.docx$|这是我的简历|作品集)/iu;
const MANUAL_REVIEW_PATTERN =
  /(参数化建模|曲面|拓扑|犀牛|技术栈|薪资|待遇|岗位|职责|做什么|作品集|是否同意|发送作品集|ai工作流|擅长吗)/u;

const TEMPLATE_OPTIONS = {
  "interview-scheduling": [
    "感谢关注，我们会先结合你的简历和背景做内部评估，合适的话会由我们这边主动联系你安排后续沟通。",
    "收到，我们会先做初步评估；如匹配度合适，会再由我们主动联系你安排下一步交流。",
    "这边会先内部评估你的资料，合适的话我们会主动联系你安排后续面试或沟通，感谢理解。",
  ],
  "contact-exchange": [
    "先在 BOSS 上沟通即可，我们内部评估后，如需要进一步沟通会由我们这边再主动联系你。",
    "目前先通过 BOSS 沟通，后续如果需要交换联系方式，我们会再主动和你同步。",
    "谢谢，现阶段先在 BOSS 上沟通；如进入下一步流程，我们会再主动联系你。",
  ],
  "generic-followup": [
    "收到，我们会先结合你的资料做内部评估，后续如有进一步安排会由我们主动联系你。",
    "这边会先做内部筛选，合适的话我们会再主动联系你同步下一步安排。",
    "感谢跟进，我们会先评估你的资料，如匹配会由我们这边再联系你。",
  ],
};

export function classifyReplyNeed(replySnippet = "") {
  const snippet = String(replySnippet || "").trim();

  if (NO_REPLY_NEEDED_PATTERN.test(snippet)) {
    return { type: "no-reply-needed", safeToReply: false };
  }

  if (INTERVIEW_PATTERN.test(snippet)) {
    return { type: "interview-scheduling", safeToReply: true };
  }

  if (CONTACT_EXCHANGE_PATTERN.test(snippet)) {
    return { type: "contact-exchange", safeToReply: true };
  }

  if (GENERIC_FOLLOWUP_PATTERN.test(snippet)) {
    return { type: "generic-followup", safeToReply: true };
  }

  if (MANUAL_REVIEW_PATTERN.test(snippet)) {
    return { type: "manual-review", safeToReply: false };
  }

  return { type: "manual-review", safeToReply: false };
}

export function buildReplyDrafts({ replySnippet = "" } = {}) {
  const classified = classifyReplyNeed(replySnippet);
  if (!classified.safeToReply) {
    return {
      type: classified.type,
      safeToReply: false,
      options: [],
      recommendedReply: "",
    };
  }

  const options = TEMPLATE_OPTIONS[classified.type] || [];
  return {
    type: classified.type,
    safeToReply: true,
    options,
    recommendedReply: options[0] || "",
  };
}
