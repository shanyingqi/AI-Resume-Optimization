import type { ChatMessage, ChatSession } from "@prisma/client";
import type {
  ChatAttachment,
  ChatContext,
  ChatMessage as ChatMessageType,
  ChatSession as ChatSessionType,
} from "@/lib/types/chat";

type SessionWithMessages = ChatSession & { messages: ChatMessage[] };

// 将数据库消息映射为聊天消息
export function toChatMessage(row: ChatMessage): ChatMessageType {
  return {
    id: row.id,
    role: row.role as ChatMessageType["role"],
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    attachments: row.attachments
      ? (row.attachments as unknown as ChatAttachment[])
      : undefined,
  };
}

// 将数据库会话映射为聊天会话
export function toChatSession(row: SessionWithMessages): ChatSessionType {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messages: row.messages.map(toChatMessage),
    context: row.context ? (row.context as unknown as ChatContext) : undefined,
  };
}

// 将数据库会话映射为聊天会话摘要
export function toChatSessionSummary(
  row: ChatSession & { messages?: ChatMessage[] },
): ChatSessionType {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messages: row.messages?.map(toChatMessage) ?? [],
    context: row.context ? (row.context as unknown as ChatContext) : undefined,
  };
}
