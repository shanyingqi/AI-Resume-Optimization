import { prisma } from "@/lib/db/prisma";
import {
  MAX_HISTORY_RECORDS,
  MONTHLY_CHAT_LIMIT,
  MONTHLY_COVER_LETTER_LIMIT,
  MONTHLY_OPTIMIZE_LIMIT,
  MONTHLY_PARSE_LIMIT,
} from "@/lib/resume/constants";
import type { UsageSummary } from "@/lib/types/project";

export type UsageAction = "optimize" | "chat" | "parse" | "cover_letter";

const ACTION_LIMITS: Record<UsageAction, number> = {
  optimize: MONTHLY_OPTIMIZE_LIMIT,
  chat: MONTHLY_CHAT_LIMIT,
  parse: MONTHLY_PARSE_LIMIT,
  cover_letter: MONTHLY_COVER_LETTER_LIMIT,
};

/** 内存缓存月度用量，避免每个 API 都 count 远程数据库 */
const USAGE_CACHE_TTL_MS = 90_000;
const usageCountCache = new Map<
  string,
  { used: number; expiresAt: number }
>();

// 获取当前月份的开始日期
function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function usageCacheKey(userId: string, action: UsageAction): string {
  return `${userId}:${action}:${startOfMonth().toISOString()}`;
}

function readCachedUsage(userId: string, action: UsageAction): number | null {
  const hit = usageCountCache.get(usageCacheKey(userId, action));
  if (!hit || hit.expiresAt <= Date.now()) return null;
  return hit.used;
}

function writeCachedUsage(userId: string, action: UsageAction, used: number) {
  usageCountCache.set(usageCacheKey(userId, action), {
    used,
    expiresAt: Date.now() + USAGE_CACHE_TTL_MS,
  });
}

function bumpCachedUsage(userId: string, action: UsageAction) {
  const key = usageCacheKey(userId, action);
  const hit = usageCountCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    hit.used += 1;
    return;
  }
  usageCountCache.delete(key);
}

/** 记录一次用户用量（后台写入，不阻塞响应） */
export function recordUsage(userId: string, action: UsageAction) {
  bumpCachedUsage(userId, action);
  void prisma.usageEvent
    .create({ data: { userId, action } })
    .catch(() => {
      usageCountCache.delete(usageCacheKey(userId, action));
    });
}

/** 统计用户当月某类操作次数 */
export async function countMonthlyUsage(userId: string, action: UsageAction) {
  const cached = readCachedUsage(userId, action);
  if (cached !== null) return cached;

  const used = await prisma.usageEvent.count({
    where: {
      userId,
      action,
      createdAt: { gte: startOfMonth() },
    },
  });
  writeCachedUsage(userId, action, used);
  return used;
}

/** 检查用户当月额度 */
export async function checkMonthlyUsage(
  userId: string,
  action: UsageAction,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const used = await countMonthlyUsage(userId, action);
  const limit = ACTION_LIMITS[action];
  if (used >= limit) {
    const nextMonth = new Date(startOfMonth());
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const retryAfterSec = Math.max(
      1,
      Math.ceil((nextMonth.getTime() - Date.now()) / 1000),
    );
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true };
}

/** 获取用户当月用量摘要 */
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const [optimize, chat, parse, coverLetter, history] = await Promise.all([
    countMonthlyUsage(userId, "optimize"),
    countMonthlyUsage(userId, "chat"),
    countMonthlyUsage(userId, "parse"),
    countMonthlyUsage(userId, "cover_letter"),
    prisma.optimizationHistory.count({
      where: { userId, deletedAt: null },
    }),
  ]);

  return {
    periodStart: startOfMonth().toISOString(),
    optimize: { used: optimize, limit: MONTHLY_OPTIMIZE_LIMIT },
    chat: { used: chat, limit: MONTHLY_CHAT_LIMIT },
    parse: { used: parse, limit: MONTHLY_PARSE_LIMIT },
    coverLetter: { used: coverLetter, limit: MONTHLY_COVER_LETTER_LIMIT },
    history: { used: history, limit: MAX_HISTORY_RECORDS },
  };
}
