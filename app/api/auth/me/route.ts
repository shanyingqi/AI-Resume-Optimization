import { getSessionFromCookies } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import { userPublicSelect } from "@/lib/auth/user-select";

/** 获取当前登录用户 */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return errorResponse("未登录", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: userPublicSelect,
  });

  if (!user) {
    return errorResponse("用户不存在", 401);
  }

  return jsonResponse({ user });
}

/** 更新当前用户资料（目前仅支持更新昵称） */
export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return errorResponse("未登录", 401);
  }

  let body: { name?: string | null; avatarUrl?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("请求格式无效");
  }

  const rawName = body.name;
  const name =
    rawName === null
      ? null
      : typeof rawName === "string"
        ? rawName.trim().slice(0, 50) || null
        : undefined;

  const rawAvatar = body.avatarUrl;
  const avatarUrl =
    rawAvatar === null
      ? null
      : typeof rawAvatar === "string"
        ? rawAvatar.trim().slice(0, 2_000_000) || null
        : undefined;

  if (name === undefined && avatarUrl === undefined) {
    return errorResponse("参数无效");
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
    select: userPublicSelect,
  });

  return jsonResponse({ user });
}
