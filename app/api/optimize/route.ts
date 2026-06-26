import { callOptimizeAIStream } from "@/lib/ai/client";
import type { OptimizeStreamEvent } from "@/lib/ai/stream-events";
import { OPTIMIZE_STEP_TOTAL } from "@/lib/ai/stream-events";
import {
  enforceRateLimit,
  trackUsage,
} from "@/lib/api/request-limit";
import { buildOptimizePrompt } from "@/lib/prompts/optimize-resume";
import {
  OPTIMIZE_RATE_LIMIT,
} from "@/lib/resume/constants";
import { validateOptimizeInputAsync } from "@/lib/resume/validate";
import type { OptimizeRequest } from "@/lib/types/resume";

function sseEncode(event: OptimizeStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** 简历 AI 优化接口（SSE 流式）：分步反馈 + 流式生成结果 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "optimize", OPTIMIZE_RATE_LIMIT);
  if (limited) return limited;

  let body: OptimizeRequest;

  try {
    body = (await request.json()) as OptimizeRequest;
  } catch {
    return new Response(JSON.stringify({ error: "请求格式无效" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { resume, jobDescription, mode, projectId } = body;
  const validationError = await validateOptimizeInputAsync(
    resume,
    jobDescription,
    mode,
    projectId,
  );
  if (validationError) {
    return new Response(JSON.stringify({ error: validationError }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      void trackUsage(request, "optimize");

      const send = (event: OptimizeStreamEvent) => {
        if (request.signal.aborted) return;
        controller.enqueue(sseEncode(event));
      };

      try {
        send({
          type: "step",
          step: 1,
          total: OPTIMIZE_STEP_TOTAL,
          message: "正在校验简历内容...",
        });

        if (request.signal.aborted) return;

        const trimmedResume = resume.trim();
        const trimmedJd = jobDescription?.trim();

        send({
          type: "step",
          step: 2,
          total: OPTIMIZE_STEP_TOTAL,
          message:
            mode === "targeted"
              ? "正在结合 JD 构建定向分析方案..."
              : "正在构建通用优化方案...",
        });

        const prompt = buildOptimizePrompt(trimmedResume, trimmedJd, mode);

        send({
          type: "step",
          step: 3,
          total: OPTIMIZE_STEP_TOTAL,
          message: "AI 正在分析简历，请稍候...",
        });

        const result = await callOptimizeAIStream(
          prompt,
          mode,
          (chars) => send({ type: "progress", chars }),
          request.signal,
        );

        if (request.signal.aborted) return;

        send({
          type: "step",
          step: 4,
          total: OPTIMIZE_STEP_TOTAL,
          message: "正在整理分析结果...",
        });

        send({ type: "result", data: result });
      } catch (error) {
        if (request.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        console.error("[optimize]", error);
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "优化失败，请稍后重试",
        });
      } finally {
        controller.close();
      }
    },
    cancel() {
      // 客户端断开连接时 request.signal 会 abort，AI 请求随之取消
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
