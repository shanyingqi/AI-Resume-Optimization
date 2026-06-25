import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { defaultHistoryTitle } from "@/lib/db/mappers/project";
import { toHistoryRecord } from "@/lib/db/mappers/history";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import { MAX_HISTORY_RECORDS } from "@/lib/resume/constants";
import type { Prisma } from "@prisma/client";
import type { OptimizeMode, OptimizeResult } from "@/lib/types/resume";

function preview(text: string, max = 80): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

/** 获取当前用户的历史记录列表 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const projectId = searchParams.get("projectId")?.trim();

    const rows = await prisma.optimizationHistory.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { resumePreview: { contains: q } },
                { jobDescriptionPreview: { contains: q } },
                { summary: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY_RECORDS,
      include: {
        project: { select: { title: true, company: true } },
      },
    });
    return jsonResponse({ records: rows.map(toHistoryRecord) });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 创建一条历史记录 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    let body: {
      mode?: OptimizeMode;
      resume?: string;
      jobDescription?: string;
      result?: OptimizeResult;
      title?: string;
      projectId?: string;
      company?: string;
      jobTitle?: string;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorResponse("请求格式无效");
    }

    if (!body.mode || !body.resume?.trim() || !body.result) {
      return errorResponse("缺少必要字段");
    }
    const resultValue = body.result as unknown as Prisma.InputJsonValue;

    let projectId = body.projectId ?? null;
    if (projectId) {
      const project = await prisma.jobApplication.findFirst({
        where: { id: projectId, userId: user.id },
      });
      if (!project) projectId = null;
    }

    const title =
      body.title?.trim().slice(0, 120) ||
      defaultHistoryTitle({
        mode: body.mode,
        company: body.company,
        title: body.jobTitle,
        jobDescription: body.jobDescription,
      });

    const record = await prisma.optimizationHistory.create({
      data: {
        userId: user.id,
        mode: body.mode,
        title,
        projectId,
        resumePreview: preview(body.resume),
        jobDescriptionPreview: body.jobDescription
          ? preview(body.jobDescription)
          : null,
        score: body.result.score,
        jdMatchRate: body.result.jdMatchRate ?? null,
        summary: body.result.summary,
        resume: body.resume,
        jobDescription: body.jobDescription ?? null,
        result: resultValue,
      },
      include: {
        project: { select: { title: true, company: true } },
      },
    });

    await prisma.resumeVersion.create({
      data: {
        userId: user.id,
        title: `${title} · 优化前`,
        content: body.resume,
        source: "optimize",
        historyId: record.id,
      },
    });

    const total = await prisma.optimizationHistory.count({
      where: { userId: user.id, deletedAt: null },
    });
    if (total > MAX_HISTORY_RECORDS) {
      const overflow = await prisma.optimizationHistory.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: total - MAX_HISTORY_RECORDS,
        select: { id: true },
      });
      if (overflow.length > 0) {
        await prisma.optimizationHistory.updateMany({
          where: { id: { in: overflow.map((r) => r.id) } },
          data: { deletedAt: new Date() },
        });
      }
    }

    return jsonResponse({ record: toHistoryRecord(record) }, 201);
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 清空当前用户全部历史记录（软删除） */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    await prisma.optimizationHistory.updateMany({
      where: { userId: user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
