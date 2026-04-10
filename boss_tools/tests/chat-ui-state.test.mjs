import test from "node:test";
import assert from "node:assert/strict";

import {
  canScrollChatList,
  detectMessageRoleFromMarkup,
  isLikelyActiveChatRow,
  pickConversationText,
} from "../src/lib/chat-ui-state.mjs";

test("pickConversationText prefers the visible conversation panel over a hidden stale one", () => {
  const text = pickConversationText([
    { text: "简历请求已发送", visible: false, area: 200000, top: 0, left: 0 },
    { text: "您好，我对岗位很感兴趣", visible: true, area: 120000, top: 0, left: 300 },
  ]);

  assert.equal(text, "您好，我对岗位很感兴趣");
});

test("pickConversationText falls back to the largest panel when multiple visible panels exist", () => {
  const text = pickConversationText([
    { text: "小面板", visible: true, area: 10000, top: 0, left: 0 },
    { text: "当前会话正文", visible: true, area: 150000, top: 0, left: 320 },
  ]);

  assert.equal(text, "当前会话正文");
});

test("isLikelyActiveChatRow treats aria-selected as active", () => {
  assert.equal(
    isLikelyActiveChatRow({
      ariaSelected: "true",
      ariaCurrent: null,
      dataSelected: null,
      className: "",
    }),
    true,
  );
});

test("isLikelyActiveChatRow treats active-like classes as active", () => {
  assert.equal(
    isLikelyActiveChatRow({
      ariaSelected: null,
      ariaCurrent: null,
      dataSelected: null,
      className: "friend-item item-active selected",
    }),
    true,
  );
});

test("isLikelyActiveChatRow treats BOSS selected rows as active", () => {
  assert.equal(
    isLikelyActiveChatRow({
      ariaSelected: null,
      ariaCurrent: null,
      dataSelected: null,
      className: "geek-item selected",
    }),
    true,
  );
});

test("isLikelyActiveChatRow does not treat a plain row as active", () => {
  assert.equal(
    isLikelyActiveChatRow({
      ariaSelected: null,
      ariaCurrent: null,
      dataSelected: null,
      className: "friend-item",
    }),
    false,
  );
});

test("canScrollChatList detects scrollable user lists", () => {
  assert.equal(
    canScrollChatList({
      className: "user-list b-scroll-stable",
      clientHeight: 491,
      scrollHeight: 7828,
    }),
    true,
  );
});

test("canScrollChatList rejects non-scrollable containers", () => {
  assert.equal(
    canScrollChatList({
      className: "geek-item-wrap",
      clientHeight: 78,
      scrollHeight: 78,
    }),
    false,
  );
});

test("detectMessageRoleFromMarkup detects self messages from nested markup", () => {
  assert.equal(
    detectMessageRoleFromMarkup('<div class="message-item"><div class="item-myself clearfix"><div class="text">hello</div></div></div>'),
    "self",
  );
});

test("detectMessageRoleFromMarkup detects friend messages from nested markup", () => {
  assert.equal(
    detectMessageRoleFromMarkup('<div class="message-item"><div><div class="item-friend">hi</div></div></div>'),
    "friend",
  );
});

test("detectMessageRoleFromMarkup detects system messages from nested markup", () => {
  assert.equal(
    detectMessageRoleFromMarkup('<div class="message-item"><div class="item-system" source="chat">简历请求已发送</div></div>'),
    "system",
  );
});
