import { callResumeChatStream } from "@/lib/ai/client";
import type { ChatStreamEvent } from "@/lib/ai/chat-stream-events";
import {
  enforceRateLimit,
  trackUsage,
} from "@/lib/api/request-limit";
import { validateChatInput } from "@/lib/chat/validate";
import { buildChatSystemPrompt } from "@/lib/prompts/chat-resume";
import { CHAT_RATE_LIMIT } from "@/lib/resume/constants";
import type { ChatRequest } from "@/lib/types/chat";

function sseEncode(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** 简历顾问多轮对话接口（SSE 流式） */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "chat", CHAT_RATE_LIMIT);
  if (limited) return limited;

  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: "请求格式无效" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, context } = body;
  const validationError = validateChatInput(messages, context);
  if (validationError) {
    return new Response(JSON.stringify({ error: validationError }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildChatSystemPrompt(context);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      void trackUsage(request, "chat");

      const send = (event: ChatStreamEvent) => {
        if (request.signal.aborted) return;
        controller.enqueue(sseEncode(event));
      };

      try {
        const content = await callResumeChatStream(
          systemPrompt,
          messages,
          (partial) => send({ type: "delta", content: partial }),
          request.signal,
        );

        if (request.signal.aborted) return;

        send({ type: "done", content });
      } catch (error) {
        if (
          request.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }
        console.error("[chat]", error);
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "对话失败，请稍后重试",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
