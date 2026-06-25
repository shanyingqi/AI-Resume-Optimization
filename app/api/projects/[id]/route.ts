import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import {
  toJobApplicationDetail,
  toJobApplicationSummary,
} from "@/lib/db/mappers/project";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import type { JobApplicationStatus } from "@/lib/types/project";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES: JobApplicationStatus[] = [
  "active",
  "applied",
  "interviewing",
  "closed",
];

/** 获取求职项目详情 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    const row = await prisma.jobApplication.findFirst({
      where: { id, userId: user.id },
      include: {
        _count: { select: { historyRecords: true, chatSessions: true } },
        historyRecords: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: { id: true, score: true, jdMatchRate: true, createdAt: true },
        },
        chatSessions: {
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        },
      },
    });

    if (!row) {
      return errorResponse("项目不存在", 404);
    }

    const summary = toJobApplicationSummary(row);
    return jsonResponse({
      project: toJobApplicationDetail(row, summary),
    });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 更新求职项目 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    let body: {
      title?: string;
      company?: string | null;
      jobDescription?: string | null;
      status?: JobApplicationStatus;
      notes?: string | null;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorResponse("请求格式无效");
    }

    const existing = await prisma.jobApplication.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return errorResponse("项目不存在", 404);
    }

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        ...(body.title !== undefined
          ? { title: body.title.trim().slice(0, 120) || existing.title }
          : {}),
        ...(body.company !== undefined
          ? { company: body.company?.trim() || null }
          : {}),
        ...(body.jobDescription !== undefined
          ? { jobDescription: body.jobDescription?.trim() || null }
          : {}),
        ...(body.status && VALID_STATUSES.includes(body.status)
          ? { status: body.status }
          : {}),
        ...(body.notes !== undefined
          ? { notes: body.notes?.trim() || null }
          : {}),
      },
      include: {
        _count: { select: { historyRecords: true, chatSessions: true } },
        historyRecords: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: { id: true, score: true, jdMatchRate: true, createdAt: true },
        },
        chatSessions: { select: { id: true } },
      },
    });

    const summary = toJobApplicationSummary(updated);
    return jsonResponse({
      project: toJobApplicationDetail(updated, summary),
    });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 删除求职项目 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    const existing = await prisma.jobApplication.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return errorResponse("项目不存在", 404);
    }

    await prisma.$transaction([
      prisma.optimizationHistory.updateMany({
        where: { projectId: id },
        data: { projectId: null },
      }),
      prisma.chatSession.updateMany({
        where: { projectId: id },
        data: { projectId: null },
      }),
      prisma.jobApplication.delete({ where: { id } }),
    ]);

    return jsonResponse({ ok: true });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
