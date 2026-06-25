import { getSessionFromRequest } from "@/lib/auth/session";

// 认证错误
export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

// 需要用户认证（仅验证 JWT，避免每个 API 都查远程数据库）
export async function requireUser(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    throw new AuthError("未登录或会话已过期");
  }

  return {
    id: session.userId,
    email: session.email,
    name: null as string | null,
    createdAt: new Date(0),
  };
}

// 认证错误响应
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
