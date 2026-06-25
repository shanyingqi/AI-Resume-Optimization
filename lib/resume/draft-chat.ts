import type { ChatContext } from "@/lib/types/chat";
import { DRAFT_CHAT_CONTEXT_KEY } from "@/lib/resume/constants";
import {
  stripClientChatFields,
  type DraftChatPayload,
} from "@/lib/resume/chat-context";

type LoadedDraft = {
  context?: ChatContext;
  autoMessage?: string;
};

/** 内存缓存，避免 React Strict Mode 二次挂载时 sessionStorage 已被清空 */
let draftCache: LoadedDraft | undefined;
let draftLoaded = false;

function parseDraft(raw: string): LoadedDraft {
  const parsed = JSON.parse(raw) as DraftChatPayload;
  const { autoMessage, ...contextFields } = parsed;
  const context = stripClientChatFields(contextFields);
  return {
    context: context && Object.keys(context).length > 0 ? context : undefined,
    autoMessage: autoMessage?.trim() || undefined,
  };
}

/** 写入待载入的对话草稿（从简历优化/求职项目跳转前调用） */
export function stashDraftChatPayload(payload: DraftChatPayload): void {
  resetDraftChatState();
  sessionStorage.setItem(DRAFT_CHAT_CONTEXT_KEY, JSON.stringify(payload));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("xiaodan-chat-draft-ready"));
  }
}

/** 读取对话草稿（同一次导航内可安全重复调用） */
export function loadDraftChatPayload(): LoadedDraft {
  if (draftLoaded) return draftCache ?? {};
  draftLoaded = true;

  try {
    const raw = sessionStorage.getItem(DRAFT_CHAT_CONTEXT_KEY);
    if (!raw) {
      draftCache = {};
      return draftCache;
    }
    sessionStorage.removeItem(DRAFT_CHAT_CONTEXT_KEY);
    draftCache = parseDraft(raw);
    return draftCache;
  } catch {
    draftCache = {};
    return draftCache;
  }
}

/** 新对话或草稿已消费后重置 */
export function resetDraftChatState(): void {
  draftCache = undefined;
  draftLoaded = false;
  sessionStorage.removeItem(DRAFT_CHAT_CONTEXT_KEY);
}
