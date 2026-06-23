import { callCoverLetterAI } from "@/lib/ai/client";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/api/rate-limit";
import { buildCoverLetterPrompt } from "@/lib/prompts/cover-letter";
import {
  COVER_LETTER_RATE_LIMIT,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/resume/constants";
import { validateCoverLetterInput } from "@/lib/resume/validate";
import type { CoverLetterRequest } from "@/lib/types/resume";

/** 根据简历与 JD 生成求职信 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(
    `cover-letter:${ip}`,
    COVER_LETTER_RATE_LIMIT,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSec);
  }

  let body: CoverLetterRequest;

  try {
    body = (await request.json()) as CoverLetterRequest;
  } catch {
    return Response.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { resume, jobDescription } = body;
  const validationError = validateCoverLetterInput(resume, jobDescription);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  try {
    const prompt = buildCoverLetterPrompt(resume.trim(), jobDescription.trim());
    const result = await callCoverLetterAI(prompt, request.signal);
    return Response.json(result);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return Response.json({ error: "请求已取消" }, { status: 499 });
    }
    console.error("[cover-letter]", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "求职信生成失败，请稍后重试",
      },
      { status: 500 },
    );
  }
}
