import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
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

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return errorResponse("邮箱和密码不能为空");
  }

  const user = await prisma.user.findUnique({ where: { email } });
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

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
  });
}
