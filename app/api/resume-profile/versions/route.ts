import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";
import { toResumeVersion } from "@/lib/db/mappers/project";
import { errorResponse, jsonResponse } from "@/lib/api/json";

/** 获取简历版本列表 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await prisma.resumeVersion.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return jsonResponse({ versions: rows.map(toResumeVersion) });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
