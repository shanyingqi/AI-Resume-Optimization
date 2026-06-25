import { resetPasswordByEmail } from "@/lib/auth/password-reset";
import { errorResponse, jsonResponse } from "@/lib/api/json";

/** 通过邮箱直接重置密码 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("请求格式无效");
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email) {
    return errorResponse("请输入邮箱");
  }
  if (!password) {
    return errorResponse("请输入新密码");
  }
  if (password.length < 6) {
    return errorResponse("密码至少 6 位");
  }
  if (password.length > 128) {
    return errorResponse("密码过长");
  }

  try {
    const ok = await resetPasswordByEmail(email, password);
    if (!ok) {
      return errorResponse("该邮箱未注册", 404);
    }
    return jsonResponse({
      ok: true,
      message: "密码已重置，请使用新密码登录",
    });
  } catch (error) {
    console.error("[POST /api/auth/forgot-password]", error);
    return errorResponse("服务暂时不可用，请稍后重试", 503);
  }
}
