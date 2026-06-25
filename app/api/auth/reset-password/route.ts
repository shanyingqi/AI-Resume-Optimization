import { resetPasswordWithToken } from "@/lib/auth/password-reset";
import { errorResponse, jsonResponse } from "@/lib/api/json";

/** 使用令牌重置密码 */
export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("请求格式无效");
  }

  const token = body.token?.trim();
  const password = body.password;
  if (!token || !password) {
    return errorResponse("缺少必要参数");
  }
  if (password.length < 6) {
    return errorResponse("密码至少 6 位");
  }

  const ok = await resetPasswordWithToken(token, password);
  if (!ok) {
    return errorResponse("重置链接无效或已过期", 400);
  }

  return jsonResponse({ ok: true });
}
