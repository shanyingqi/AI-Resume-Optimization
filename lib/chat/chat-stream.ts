import type { ChatStreamEvent } from "@/lib/ai/chat-stream-events";
import type { ChatRequest } from "@/lib/types/chat";

/** 消费聊天接口的 SSE 流，实时回传助手回复 */
export async function consumeChatStream(
  request: ChatRequest,
  onDelta: (content: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(request),
    signal,
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "请求失败");
    }
    if (res.status === 429) {
      throw new Error("请求过于频繁，请稍后再试");
    }
    throw new Error(`请求失败 (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("无法读取响应流");
  }

  if (signal) {
    signal.addEventListener("abort", () => void reader.cancel(), { once: true });
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

  const applyEvent = (event: ChatStreamEvent) => {
    if (event.type === "delta") {
      onDelta(event.content);
      return;
    }
    if (event.type === "done") {
      result = event.content;
      return;
    }
    if (event.type === "error") {
      throw new Error(event.message);
    }
  };

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException("请求已取消", "AbortError");
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        applyEvent(JSON.parse(line.slice(6)) as ChatStreamEvent);
      }
    }
  }

  if (buffer.trim()) {
    for (const line of buffer.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      applyEvent(JSON.parse(line.slice(6)) as ChatStreamEvent);
    }
  }

  if (!result) {
    throw new Error("未收到回复，请重试");
  }

  return result;
}
