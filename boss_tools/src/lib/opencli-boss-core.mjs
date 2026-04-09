import { checkDaemonStatus, sendCommand, wrapForEval } from "./opencli-daemon.mjs";
import { canScrollChatList, isLikelyActiveChatRow, pickConversationText } from "./chat-ui-state.mjs";

const CHAT_URL = "https://www.zhipin.com/web/chat/index";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureOpenCliReady() {
  const status = await checkDaemonStatus({ timeout: 1000 });
  if (!status.running) {
    throw new Error("opencli daemon is not running; run `opencli doctor` first");
  }
  if (!status.extensionConnected) {
    throw new Error("opencli extension is not connected; run `opencli doctor` and reconnect the Browser Bridge extension");
  }
}

export class BossPageSession {
  constructor({ workspace = "site:boss", logger = null } = {}) {
    this.workspace = workspace;
    this.logger = logger;
    this.tabId = null;
  }

  async navigateChat() {
    const nav = await sendCommand("navigate", {
      workspace: this.workspace,
      url: CHAT_URL,
    });
    this.tabId = nav?.tabId ?? null;
    if (!this.tabId) {
      throw new Error("navigate did not return tabId");
    }
    await sleep(3000);
    await this.ensureChat();
    this.log({ step: "navigate-chat", tabId: this.tabId, href: CHAT_URL, result: "ok" });
    return this.tabId;
  }

  async exec(js) {
    if (!this.tabId) {
      throw new Error("tabId is not set");
    }
    return sendCommand("exec", {
      workspace: this.workspace,
      tabId: this.tabId,
      code: wrapForEval(js),
    });
  }

  async ensureChat() {
    const href = await this.exec("location.href");
    if (typeof href !== "string" || !href.includes("/web/chat/index")) {
      throw new Error(`controlled tab left chat page: ${href}`);
    }
    return href;
  }

  async fetchRawFriendList() {
    return this.exec(`(async () => {
      const res = await fetch('/wapi/zprelation/friend/getBossFriendListV2.json?page=1&status=0&jobId=0', { credentials: 'include' });
      const data = await res.json();
      return data?.zpData?.friendList || [];
    })()`);
  }

  async openChatByUid(uid) {
    const targetUid = String(uid).replace(/[^0-9]/g, "");
    await this.exec(`(() => {
      const list = document.querySelector('.user-list');
      if (list) {
        list.scrollTop = 0;
        list.dispatchEvent(new Event('scroll', { bubbles: true }));
      }
      return {
        hasUserList: Boolean(list),
        scrollTop: list ? list.scrollTop : null,
      };
    })()`);
    await sleep(200);

    let clickResult = { clicked: false };
    for (let attempt = 0; attempt < 24; attempt += 1) {
      clickResult = await this.exec(`(() => {
        const id = ${JSON.stringify(targetUid)};
        const item = document.querySelector('#_' + id + '-0') || document.querySelector('[id^="_' + id + '"]');
        if (item) {
          item.scrollIntoView({ block: 'center' });
          item.click();
          return {
            clicked: true,
            id: item.id || null,
            text: (item.innerText || '').slice(0, 120),
            className: String(item.className || ''),
            ariaSelected: item.getAttribute('aria-selected'),
            ariaCurrent: item.getAttribute('aria-current'),
            dataSelected: item.getAttribute('data-selected'),
          };
        }

        const list = document.querySelector('.user-list');
        if (!list) {
          return { clicked: false, reason: 'missing-user-list', atEnd: true };
        }

        const maxScrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
        const nextScrollTop = Math.min(
          maxScrollTop,
          list.scrollTop + Math.max(220, Math.floor(list.clientHeight * 0.8)),
        );
        const moved = nextScrollTop > list.scrollTop;
        list.scrollTop = nextScrollTop;
        list.dispatchEvent(new Event('scroll', { bubbles: true }));
        return {
          clicked: false,
          reason: moved ? 'scrolled-user-list' : 'chat-row-not-found',
          moved,
          atEnd: !moved || nextScrollTop >= maxScrollTop,
          scrollTop: list.scrollTop,
          clientHeight: list.clientHeight,
          scrollHeight: list.scrollHeight,
          className: String(list.className || ''),
        };
      })()`);

      if (clickResult?.clicked) {
        break;
      }

      if (
        (clickResult?.atEnd && clickResult?.moved === false) ||
        !canScrollChatList({
          className: clickResult?.className,
          clientHeight: clickResult?.clientHeight,
          scrollHeight: clickResult?.scrollHeight,
        })
      ) {
        throw new Error(`chat-row-not-found:${JSON.stringify({ uid: targetUid, clickResult })}`);
      }

      await sleep(250);
    }

    if (!clickResult?.clicked) {
      throw new Error(`chat-row-not-found:${JSON.stringify({ uid: targetUid, clickResult })}`);
    }

    let selectedState = clickResult;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await sleep(400);
      selectedState = await this.exec(`(() => {
        const id = ${JSON.stringify(targetUid)};
        const item = document.querySelector('#_' + id + '-0') || document.querySelector('[id^="_' + id + '"]');
        if (!item) return { present: false };
        return {
          present: true,
          id: item.id || null,
          text: (item.innerText || '').slice(0, 120),
          className: String(item.className || ''),
          ariaSelected: item.getAttribute('aria-selected'),
          ariaCurrent: item.getAttribute('aria-current'),
          dataSelected: item.getAttribute('data-selected'),
        };
      })()`);
      if (isLikelyActiveChatRow(selectedState)) {
        break;
      }
    }

    await this.ensureChat();
    if (!isLikelyActiveChatRow(selectedState)) {
      throw new Error(`chat-switch-not-confirmed:${JSON.stringify({ uid: targetUid, selectedState })}`);
    }
    return { ...clickResult, selectedState };
  }

  async readConversationDom() {
    const snapshot = await this.exec(`(() => {
      const conversationCandidates = Array.from(document.querySelectorAll('.chat-message-list,.conversation-message'))
        .map(el => {
          const rect = el.getBoundingClientRect();
          return {
            text: el.innerText || '',
            visible: el.offsetParent !== null && rect.width > 0 && rect.height > 0,
            area: Math.round(rect.width * rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
          };
        });
      const visibleNodes = Array.from(document.querySelectorAll('button,input,span,div,a'))
        .filter(el => el.offsetParent !== null);
      const visibleTexts = visibleNodes
        .map(el => ((el.value || '') + ' ' + (el.textContent || '')).trim())
        .filter(Boolean);
      const disabledTexts = visibleNodes
        .filter(el =>
          el.matches(':disabled') ||
          el.getAttribute('aria-disabled') === 'true' ||
          String(el.className || '').includes('disabled')
        )
        .map(el => ((el.value || '') + ' ' + (el.textContent || '')).trim())
        .filter(Boolean);
      const editor = document.querySelector('#boss-chat-editor-input,[contenteditable="true"],textarea,input[type="text"]');
      return {
        href: location.href,
        conversationCandidates,
        visibleTexts,
        disabledTexts,
        editorText: editor ? ((editor.value || editor.textContent || '').trim()) : '',
      };
    })()`);

    return {
      ...snapshot,
      conversationText: pickConversationText(snapshot?.conversationCandidates || []),
    };
  }

  async sendMessage(text) {
    const result = await this.exec(`(() => {
      const el = document.querySelector('#boss-chat-editor-input');
      const btn = document.querySelector('.submit-content .submit,.conversation-editor .submit,.conversation-operate .submit');
      if (!el || !btn) return { ok: false, reason: 'missing-editor-or-button' };
      el.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('insertText', false, ${JSON.stringify(text)});
      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: ${JSON.stringify(text)}, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
      for (const type of ['mousedown', 'mouseup', 'click']) {
        btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      }
      return { ok: true, buttonText: (btn.textContent || '').trim(), editorText: (el.textContent || '').trim() };
    })()`);
    await sleep(2500);
    return result;
  }

  async clickExactText(label) {
    const result = await this.exec(`(() => {
      const target = ${JSON.stringify(label)};
      const nodes = Array.from(document.querySelectorAll('button,input,span,div,a')).filter(el => el.offsetParent !== null);
      for (const el of nodes) {
        const txt = ((el.value || '') + ' ' + (el.textContent || '')).trim();
        if (txt === target) {
          for (const type of ['mousedown', 'mouseup', 'click']) {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
          }
          return { clicked: true, tag: el.tagName, cls: el.className || '', text: txt };
        }
      }
      return { clicked: false, label: target };
    })()`);
    await sleep(1200);
    return result;
  }

  log(payload) {
    if (this.logger) {
      this.logger.event(payload);
    }
  }
}
