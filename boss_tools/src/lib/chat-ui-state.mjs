const ACTIVE_CLASS_PATTERN = /\b(active|selected|current|focus|focused|checked|choose|chosen|on)\b/i;
const SELF_MESSAGE_PATTERN = /\bitem-myself\b/i;
const FRIEND_MESSAGE_PATTERN = /\bitem-friend\b/i;
const SYSTEM_MESSAGE_PATTERN = /\bitem-system\b/i;

export function pickConversationText(candidates = []) {
  const normalized = candidates
    .map((candidate) => ({
      text: String(candidate?.text || ""),
      visible: candidate?.visible === true,
      area: Number(candidate?.area || 0),
      top: Number(candidate?.top || 0),
      left: Number(candidate?.left || 0),
    }))
    .filter((candidate) => candidate.text.trim());

  const pool = normalized.some((candidate) => candidate.visible)
    ? normalized.filter((candidate) => candidate.visible)
    : normalized;

  if (pool.length === 0) {
    return "";
  }

  pool.sort((a, b) => {
    if (b.area !== a.area) {
      return b.area - a.area;
    }
    if (a.left !== b.left) {
      return a.left - b.left;
    }
    return a.top - b.top;
  });

  return pool[0].text;
}

export function isLikelyActiveChatRow(state = {}) {
  const ariaSelected = String(state?.ariaSelected || "").toLowerCase();
  const ariaCurrent = String(state?.ariaCurrent || "").toLowerCase();
  const dataSelected = String(state?.dataSelected || "").toLowerCase();
  const className = String(state?.className || "");

  return (
    ariaSelected === "true" ||
    (ariaCurrent && ariaCurrent !== "false") ||
    dataSelected === "true" ||
    ACTIVE_CLASS_PATTERN.test(className)
  );
}

export function canScrollChatList(state = {}) {
  const className = String(state?.className || "");
  const clientHeight = Number(state?.clientHeight || 0);
  const scrollHeight = Number(state?.scrollHeight || 0);

  return className.includes("user-list") && scrollHeight > clientHeight + 8;
}

export function detectMessageRoleFromMarkup(markup = "") {
  const text = String(markup || "");
  if (SELF_MESSAGE_PATTERN.test(text)) return "self";
  if (FRIEND_MESSAGE_PATTERN.test(text)) return "friend";
  if (SYSTEM_MESSAGE_PATTERN.test(text)) return "system";
  return "";
}
