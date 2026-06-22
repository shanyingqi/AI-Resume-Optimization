import { NextResponse } from "next/server";
import { callOptimizeAI } from "@/lib/ai/client";
import { buildOptimizePrompt } from "@/lib/prompts/optimize-resume";
import type { OptimizeRequest } from "@/lib/types/resume";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OptimizeRequest;
    const { resume, jobDescription, mode } = body;

    if (!resume?.trim()) {
      return NextResponse.json(
        { error: "请提供简历内容" },
        { status: 400 },
      );
    }

    if (mode === "targeted" && !jobDescription?.trim()) {
      return NextResponse.json(
        { error: "定向优化模式下请提供岗位 JD" },
        { status: 400 },
      );
    }

    const prompt = buildOptimizePrompt(resume.trim(), jobDescription?.trim(), mode);
    const result = await callOptimizeAI(prompt, mode);

    return NextResponse.json({
      ...result,
      mock: !process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.error("[optimize]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "优化失败，请稍后重试" },
      { status: 500 },
    );
  }
}
