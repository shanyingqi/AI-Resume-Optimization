import { apiFetch } from "@/lib/api/client";
import type { ChatContext, ChatMessage, ChatSession } from "@/lib/types/chat";

// 预览文本
function preview(text: string, max = 40): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

/** 通知侧边栏等组件刷新会话列表 */
export function notifySessionsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("xiaodan-sessions-updated"));
  }
}

/** 从服务端加载有消息的聊天会话 */
export async function fetchChatSessions(): Promise<ChatSession[]> {
  const data = await apiFetch<{ sessions: ChatSession[] }>("/api/chat/sessions");
  return data.sessions;
}

/** 获取单个会话 */
export async function fetchChatSession(id: string): Promise<ChatSession | null> {
  try {
    const data = await apiFetch<{ session: ChatSession }>(
      `/api/chat/sessions/${id}`,
    );
    return data.session;
  } catch {
    return null;
  }
}

/** 创建草稿会话（不写入服务端，发送首条消息后才保存） */
export function createDraftSession(
  context?: ChatContext,
  links?: { historyId?: string; projectId?: string },
): ChatSession {
  const title =
    context?.projectTitle?.trim() ||
    (context?.optimizeSummary
      ? `优化追问 · ${preview(context.optimizeSummary, 24)}`
      : "新对话");

  return {
    id: crypto.randomUUID(),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    context,
    historyId: links?.historyId ?? context?.historyId,
    projectId: links?.projectId ?? context?.projectId,
  };
}

/** 持久化会话（新建或更新） */
export async function saveChatSession(session: ChatSession): Promise<ChatSession> {
  const existing = await fetchChatSession(session.id).catch(() => null);

  if (existing) {
    const data = await apiFetch<{ session: ChatSession }>(
      `/api/chat/sessions/${session.id}`,
      {
        method: "PUT",
        body: JSON.stringify({ session }),
      },
    );
    notifySessionsUpdated();
    return data.session;
  }

  const data = await apiFetch<{ session: ChatSession }>("/api/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ session }),
  });
  notifySessionsUpdated();
  return data.session;
}

/** 追加消息并自动更新标题（基于内存中的 session 对象） */
export function appendMessageToSession(
  session: ChatSession,
  message: ChatMessage,
): ChatSession {
  let title = session.title;
  if (title === "新对话" && message.role === "user") {
    title = preview(message.content);
  }

  const persistedMessage: ChatMessage = { ...message };
  if (message.attachments?.length) {
    persistedMessage.attachments = message.attachments.map((att) => ({ ...att }));
  }

  return {
    ...session,
    title,
    updatedAt: new Date().toISOString(),
    messages: [...session.messages, persistedMessage],
  };
}

/** 更新最后一条助手消息（基于内存中的 session 对象） */
export function updateSessionLastAssistant(
  session: ChatSession,
  content: string,
): ChatSession {
  const messages = [...session.messages];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return session;

  messages[messages.length - 1] = { ...last, content };
  return { ...session, messages, updatedAt: new Date().toISOString() };
}

/** 删除会话 */
export async function deleteChatSession(id: string): Promise<ChatSession[]> {
  await apiFetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
  notifySessionsUpdated();
  return fetchChatSessions();
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
