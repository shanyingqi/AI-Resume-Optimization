/** 内存滑动窗口限流（单实例有效；多实例部署需 Redis 等外部存储） */
const buckets = new Map<string, number[]>();

// 获取客户端 IP
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

// 检查速率限制
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const retryAfterSec = Math.ceil((recent[0] + windowMs - now) / 1000);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { allowed: true };
}

// 返回速率限制响应
export function rateLimitResponse(retryAfterSec: number) {
  return new Response(
    JSON.stringify({
      error: `请求过于频繁，请 ${retryAfterSec} 秒后再试`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
