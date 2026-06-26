import { normalizeEmail, validateEmail } from "@/lib/auth/email";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { userPublicSelect } from "@/lib/auth/user-select";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/json";

/** 用户登录 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("请求格式无效");
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  if (!password) {
    return errorResponse("密码不能为空");
  }

  const emailError = validateEmail(email);
  if (emailError) return errorResponse(emailError);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...userPublicSelect, passwordHash: true },
    });
    if (!user) {
      return errorResponse("邮箱或密码错误", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return errorResponse("邮箱或密码错误", 401);
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
    });
    await setSessionCookie(token);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...publicUser } = user;
    return jsonResponse({
      user: {
        ...publicUser,
        createdAt: publicUser.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return errorResponse("服务暂时不可用，请稍后重试", 503);
  }
}
