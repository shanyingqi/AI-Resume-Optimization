import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { toHistoryRecord } from "@/lib/db/mappers/history";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import { MAX_HISTORY_RECORDS } from "@/lib/resume/constants";
import type { Prisma } from "@prisma/client";
import type { OptimizeMode, OptimizeResult } from "@/lib/types/resume";

// 预览文本
function preview(text: string, max = 80): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

/** 获取当前用户的历史记录列表 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await prisma.optimizationHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY_RECORDS,
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

    const record = await prisma.optimizationHistory.create({
      data: {
        userId: user.id,
        mode: body.mode,
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
    });

    const total = await prisma.optimizationHistory.count({
      where: { userId: user.id },
    });
    if (total > MAX_HISTORY_RECORDS) {
      const overflow = await prisma.optimizationHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        take: total - MAX_HISTORY_RECORDS,
        select: { id: true },
      });
      if (overflow.length > 0) {
        await prisma.optimizationHistory.deleteMany({
          where: { id: { in: overflow.map((r) => r.id) } },
        });
      }
    }

    return jsonResponse({ record: toHistoryRecord(record) }, 201);
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 清空当前用户全部历史记录 */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    await prisma.optimizationHistory.deleteMany({ where: { userId: user.id } });
    return jsonResponse({ ok: true });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
