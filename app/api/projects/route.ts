import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import {
  toJobApplicationDetail,
  toJobApplicationSummary,
} from "@/lib/db/mappers/project";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import type { JobApplicationStatus } from "@/lib/types/project";

const VALID_STATUSES: JobApplicationStatus[] = [
  "active",
  "applied",
  "interviewing",
  "closed",
];

function preview(text: string, max = 80): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

/** 获取求职项目列表 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const q = searchParams.get("q")?.trim();

    const rows = await prisma.jobApplication.findMany({
      where: {
        userId: user.id,
        ...(status && VALID_STATUSES.includes(status as JobApplicationStatus)
          ? { status }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { company: { contains: q } },
                { jobDescription: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { historyRecords: true, chatSessions: true } },
      },
    });

    return jsonResponse({
      projects: rows.map((row) =>
        toJobApplicationSummary({ ...row, historyRecords: [] }),
      ),
    });
  } catch (error) {
    console.error("[GET /api/projects]", error);
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}

/** 创建求职项目 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    let body: {
      title?: string;
      company?: string;
      jobDescription?: string;
      status?: JobApplicationStatus;
      historyId?: string;
      notes?: string;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorResponse("请求格式无效");
    }

    const title = body.title?.trim();
    if (!title) {
      return errorResponse("岗位名称不能为空");
    }

    const status =
      body.status && VALID_STATUSES.includes(body.status)
        ? body.status
        : "active";

    const project = await prisma.jobApplication.create({
      data: {
        userId: user.id,
        title,
        company: body.company?.trim() || null,
        jobDescription: body.jobDescription?.trim() || null,
        status,
        notes: body.notes?.trim() || null,
      },
    });

    if (body.historyId) {
      const history = await prisma.optimizationHistory.findFirst({
        where: { id: body.historyId, userId: user.id, deletedAt: null },
      });
      if (history) {
        await prisma.optimizationHistory.update({
          where: { id: history.id },
          data: {
            projectId: project.id,
            title:
              history.title ??
              `${body.company?.trim() || "求职项目"} · ${title}`,
          },
        });
      }
    }

    return jsonResponse(
      {
        project: toJobApplicationSummary({
          ...project,
          _count: { historyRecords: 0, chatSessions: 0 },
          historyRecords: [],
        }),
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/projects]", error);
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
