import { getSessionFromCookies } from "@/lib/auth/session";
import { errorResponse, jsonResponse } from "@/lib/api/json";

/** 快速会话检查（仅验证 JWT，不查数据库） */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return errorResponse("未登录", 401);
  }

  return jsonResponse({
    user: {
      id: session.userId,
      email: session.email,
      name: null,
      avatarUrl: null,
      createdAt: new Date(0).toISOString(),
    },
  });
}
