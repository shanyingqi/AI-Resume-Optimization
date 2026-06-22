import type { OptimizeStreamEvent } from "@/lib/ai/stream-events";
import {
  INITIAL_LOADING_STATE,
  type OptimizeLoadingState,
} from "@/lib/ai/stream-events";
import type { OptimizeRequest, OptimizeResult } from "@/lib/types/resume";

export type { OptimizeLoadingState };
export { INITIAL_LOADING_STATE };

/** 消费优化接口的 SSE 流，实时更新加载状态 */
export async function consumeOptimizeStream(
  request: OptimizeRequest,
  onUpdate: (state: OptimizeLoadingState) => void,
  signal?: AbortSignal,
): Promise<OptimizeResult> {
  const res = await fetch("/api/optimize", {
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
  let result: OptimizeResult | null = null;
  let state = { ...INITIAL_LOADING_STATE };

  const applyEvent = (event: OptimizeStreamEvent) => {
    if (event.type === "step") {
      state = {
        ...state,
        step: event.step,
        total: event.total,
        message: event.message,
      };
      onUpdate(state);
      return;
    }
    if (event.type === "progress") {
      state = { ...state, streamChars: event.chars };
      onUpdate(state);
      return;
    }
    if (event.type === "result") {
      result = event.data;
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
        applyEvent(JSON.parse(line.slice(6)) as OptimizeStreamEvent);
      }
    }
  }

  if (buffer.trim()) {
    for (const line of buffer.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      applyEvent(JSON.parse(line.slice(6)) as OptimizeStreamEvent);
    }
  }

  if (!result) {
    throw new Error("未收到分析结果，请重试");
  }

  return result;
}
