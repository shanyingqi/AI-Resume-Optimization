import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  trackUsage,
} from "@/lib/api/request-limit";
import {
  MAX_RESUME_FILE_SIZE,
  PARSE_RATE_LIMIT,
} from "@/lib/resume/constants";
import { parseDocx, parsePdf } from "@/lib/resume/parse-server";
import { validateResumeLength } from "@/lib/resume/validate";

// PDF/DOCX 解析依赖 Node.js Buffer，需使用 nodejs 运行时
export const runtime = "nodejs";

/** 简历文件解析接口：接收 PDF / DOCX，返回提取的纯文本 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "parse", PARSE_RATE_LIMIT);
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "请上传简历文件" }, { status: 400 });
    }

    if (file.size > MAX_RESUME_FILE_SIZE) {
      return NextResponse.json(
        { error: "文件大小不能超过 5MB" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let text = "";

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      text = await parsePdf(buffer);
    } else if (
      name.endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      text = await parseDocx(buffer);
    } else {
      return NextResponse.json(
        { error: "仅支持 PDF、DOCX 文件上传，文本文件请直接粘贴" },
        { status: 400 },
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "未能从文件中提取到文字，请尝试粘贴文本或更换文件" },
        { status: 400 },
      );
    }

    const lengthError = validateResumeLength(text);
    if (lengthError) {
      return NextResponse.json(
        { error: `${lengthError}，请精简后重新上传` },
        { status: 400 },
      );
    }

    void trackUsage(request, "parse");

    return NextResponse.json({
      text,
      fileName: file.name,
      charCount: text.length,
    });
  } catch (error) {
    console.error("[parse-resume]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "文件解析失败，请稍后重试",
      },
      { status: 500 },
    );
  }
}
