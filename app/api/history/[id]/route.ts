import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { toHistoryRecord } from "@/lib/db/mappers/history";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import type { Prisma } from "@prisma/client";
import type { CoverLetterResult, ResumeTemplateId } from "@/lib/types/resume";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 更新历史记录（求职信、模板等） */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    let body: {
      coverLetter?: CoverLetterResult;
      resumeTemplateId?: ResumeTemplateId;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorResponse("请求格式无效");
    }
    const coverLetterValue =
      body.coverLetter !== undefined
        ? (body.coverLetter as unknown as Prisma.InputJsonValue)
        : undefined;

    const existing = await prisma.optimizationHistory.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return errorResponse("记录不存在", 404);
    }

    const updated = await prisma.optimizationHistory.update({
      where: { id },
      data: {
        ...(coverLetterValue !== undefined
          ? { coverLetter: coverLetterValue }
          : {}),
        ...(body.resumeTemplateId !== undefined
          ? { resumeTemplateId: body.resumeTemplateId }
          : {}),
      },
    });

    return jsonResponse({ record: toHistoryRecord(updated) });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 删除单条历史记录 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    const existing = await prisma.optimizationHistory.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return errorResponse("记录不存在", 404);
    }

    await prisma.optimizationHistory.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
