import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { toHistoryRecord } from "@/lib/db/mappers/history";
import { errorResponse, jsonResponse } from "@/lib/api/json";

/** 对比两条历史记录 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const leftId = searchParams.get("left");
    const rightId = searchParams.get("right");

    if (!leftId || !rightId) {
      return errorResponse("请提供 left 与 right 参数");
    }

    const rows = await prisma.optimizationHistory.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        id: { in: [leftId, rightId] },
      },
      include: {
        project: { select: { title: true, company: true } },
      },
    });

    if (rows.length !== 2) {
      return errorResponse("记录不存在", 404);
    }

    const left = rows.find((r) => r.id === leftId);
    const right = rows.find((r) => r.id === rightId);
    if (!left || !right) {
      return errorResponse("记录不存在", 404);
    }

    return jsonResponse({
      left: toHistoryRecord(left),
      right: toHistoryRecord(right),
    });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
