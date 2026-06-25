import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MS = 60 * 60 * 1000;

// 哈希令牌
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** 创建密码重置令牌，返回明文 token（仅用于发送给用户） */
export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const token = randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const expires = new Date(Date.now() + RESET_EXPIRY_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashToken(token),
      passwordResetExpires: expires,
    },
  });

  return { userId: user.id, token, expires };
}

/** 通过注册邮箱直接重置密码 */
export async function resetPasswordByEmail(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return false;

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  return true;
}

/** 使用令牌重置密码 */
export async function resetPasswordWithToken(token: string, password: string) {
  const hashed = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashed,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return false;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  return true;
}
