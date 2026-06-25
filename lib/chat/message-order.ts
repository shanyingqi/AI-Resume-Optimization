import type { ChatMessage } from "@/lib/types/chat";

/** 按时间排序；时间相同时用户消息排在助手之前 */
export function sortChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const diff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (diff !== 0) return diff;
    if (a.role === b.role) return 0;
    return a.role === "user" ? -1 : 1;
  });
}

/** 成对消息时间戳：用户在前，助手在后（间隔 1 秒，兼容 MySQL DateTime 秒级精度） */
export function pairedMessageTimes(): [string, string] {
  const base = Date.now();
  return [new Date(base).toISOString(), new Date(base + 1000).toISOString()];
}

/** 在已有消息之后生成一对时间戳 */
export function nextPairedMessageTimes(messages: ChatMessage[]): [string, string] {
  const last = messages[messages.length - 1];
  const base = last
    ? new Date(last.createdAt).getTime() + 2000
    : Date.now();
  return [new Date(base).toISOString(), new Date(base + 1000).toISOString()];
}
