import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 创建 Prisma 客户端
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// 在开发环境时，将 Prisma 客户端设置为全局变量
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
