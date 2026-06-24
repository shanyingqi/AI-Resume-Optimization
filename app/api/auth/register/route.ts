import { hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, jsonResponse } from "@/lib/api/json";
import { userPublicSelect } from "@/lib/auth/user-select";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 验证邮箱
function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return "邮箱不能为空";
  if (!EMAIL_RE.test(trimmed)) return "邮箱格式无效";
  return null;
}

// 验证密码
function validatePassword(password: string): string | null {
  if (!password) return "密码不能为空";
  if (password.length < 6) return "密码至少 6 位";
  if (password.length > 128) return "密码过长";
  return null;
}

/** 用户注册 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string; name?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("请求格式无效");
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim() || null;

  const emailError = validateEmail(email);
  if (emailError) return errorResponse(emailError);

  const passwordError = validatePassword(password);
  if (passwordError) return errorResponse(passwordError);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return errorResponse("该邮箱已注册", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: userPublicSelect,
  });

  const token = await createSessionToken({ userId: user.id, email: user.email });
  await setSessionCookie(token);

  return jsonResponse({ user }, 201);
}
