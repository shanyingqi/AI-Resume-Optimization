import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import { MAX_JD_CHARS, MAX_RESUME_CHARS } from "@/lib/resume/constants";
import type { OptimizeMode } from "@/lib/types/resume";

type InputTab = "upload" | "paste";

function toDraftResponse(draft: {
  resume: string;
  jobDescription: string;
  mode: string;
  inputTab: string;
  updatedAt: Date;
}) {
  return {
    resume: draft.resume,
    jobDescription: draft.jobDescription,
    mode: draft.mode as OptimizeMode,
    inputTab: draft.inputTab as InputTab,
    updatedAt: draft.updatedAt.toISOString(),
  };
}

/** 获取当前账号的优化草稿 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const draft = await prisma.optimizeDraft.findUnique({
      where: { userId: user.id },
    });
    return jsonResponse({
      draft: draft ? toDraftResponse(draft) : null,
    });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 保存当前账号的优化草稿 */
export async function PUT(request: Request) {
  try {
    const user = await requireUser(request);
    let body: {
      resume?: string;
      jobDescription?: string;
      mode?: OptimizeMode;
      inputTab?: InputTab;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorResponse("请求格式无效");
    }

    const resume = body.resume ?? "";
    const jobDescription = body.jobDescription ?? "";
    const mode = body.mode === "targeted" ? "targeted" : "general";
    const inputTab = body.inputTab === "paste" ? "paste" : "upload";

    if (resume.length > MAX_RESUME_CHARS) {
      return errorResponse(`简历不能超过 ${MAX_RESUME_CHARS.toLocaleString()} 字`);
    }
    if (jobDescription.length > MAX_JD_CHARS) {
      return errorResponse(`职位描述不能超过 ${MAX_JD_CHARS.toLocaleString()} 字`);
    }

    const draft = await prisma.optimizeDraft.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        resume,
        jobDescription,
        mode,
        inputTab,
      },
      update: { resume, jobDescription, mode, inputTab },
    });

    return jsonResponse({ draft: toDraftResponse(draft) });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 清空当前账号的优化草稿 */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    await prisma.optimizeDraft.deleteMany({ where: { userId: user.id } });
    return jsonResponse({ ok: true });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
