import {
  CHAT_STORAGE_KEY,
  MAX_CHAT_SESSIONS,
} from "@/lib/resume/constants";
import type { ChatContext, ChatMessage, ChatSession } from "@/lib/types/chat";

// 预览文本
function preview(text: string, max = 40): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

// 读取原始会话
function readRawSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const sessions = JSON.parse(raw) as ChatSession[];
    return Array.isArray(sessions) ? sessions : [];
  } catch {
    return [];
  }
}

// 持久化会话
function persistSessions(sessions: ChatSession[]): void {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  notifySessionsUpdated();
}

/** 通知侧边栏等组件刷新会话列表 */
export function notifySessionsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("xiaodan-sessions-updated"));
  }
}

/** 从 localStorage 读取有消息的聊天会话 */
export function loadChatSessions(): ChatSession[] {
  const raw = readRawSessions();
  const sessions = raw.filter((s) => s.messages.length > 0);
  if (raw.length !== sessions.length) {
    persistSessions(sessions);
  }
  return sessions;
}

/** 获取单个会话（仅已持久化且有消息的会话） */
export function getChatSession(id: string): ChatSession | null {
  return loadChatSessions().find((s) => s.id === id) ?? null;
}

/** 创建草稿会话（不写入 localStorage，发送首条消息后才保存） */
export function createDraftSession(context?: ChatContext): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: "新对话",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    context,
  };
}

/** 持久化会话（新建或更新） */
export function saveChatSession(session: ChatSession): void {
  const sessions = loadChatSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  const updated = { ...session, updatedAt: new Date().toISOString() };

  if (index >= 0) {
    sessions[index] = updated;
  } else {
    sessions.unshift(updated);
  }

  persistSessions(sessions.slice(0, MAX_CHAT_SESSIONS));
}

/** 追加消息并自动更新标题 */
export function appendChatMessage(
  sessionId: string,
  message: ChatMessage,
): ChatSession | null {
  const session = getChatSession(sessionId);
  if (!session) return null;

  let title = session.title;
  if (title === "新对话" && message.role === "user") {
    title = preview(message.content);
  }

  // 持久化时保留附件正文，供后续多轮对话 API 回放
  const persistedMessage: ChatMessage = { ...message };
  if (message.attachments?.length) {
    persistedMessage.attachments = message.attachments.map((att) => ({ ...att }));
  }

  const updated: ChatSession = {
    ...session,
    title,
    messages: [...session.messages, persistedMessage],
  };
  saveChatSession(updated);
  return updated;
}

/** 更新最后一条助手消息（流式生成时） */
export function updateLastAssistantMessage(
  sessionId: string,
  content: string,
): ChatSession | null {
  const session = getChatSession(sessionId);
  if (!session) return null;

  const messages = [...session.messages];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return null;

  messages[messages.length - 1] = { ...last, content };
  const updated: ChatSession = { ...session, messages };
  saveChatSession(updated);
  return updated;
}

/** 删除会话 */
export function deleteChatSession(id: string): ChatSession[] {
  const next = loadChatSessions().filter((s) => s.id !== id);
  persistSessions(next);
  return next;
}

/** 格式化会话时间 */
export function formatChatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `今天 ${time}`;

  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export { preview as previewChatTitle };
