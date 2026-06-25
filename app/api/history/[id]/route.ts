import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { toHistoryRecord } from "@/lib/db/mappers/history";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import type { Prisma } from "@prisma/client";
import type { CoverLetterResult, ResumeTemplateId } from "@/lib/types/resume";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 更新历史记录 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    let body: {
      coverLetter?: CoverLetterResult;
      resumeTemplateId?: ResumeTemplateId;
      title?: string;
      projectId?: string | null;
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
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) {
      return errorResponse("记录不存在", 404);
    }

    let projectId: string | null | undefined = undefined;
    if (body.projectId !== undefined) {
      if (body.projectId === null) {
        projectId = null;
      } else {
        const project = await prisma.jobApplication.findFirst({
          where: { id: body.projectId, userId: user.id },
        });
        projectId = project ? project.id : null;
      }
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
        ...(body.title !== undefined
          ? { title: body.title.trim().slice(0, 120) || existing.title }
          : {}),
        ...(projectId !== undefined ? { projectId } : {}),
      },
      include: {
        project: { select: { title: true, company: true } },
      },
    });

    return jsonResponse({ record: toHistoryRecord(updated) });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 软删除单条历史记录 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    const existing = await prisma.optimizationHistory.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) {
      return errorResponse("记录不存在", 404);
    }

    await prisma.optimizationHistory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
