import { getSessionFromRequest } from "@/lib/auth/session";
import { checkMonthlyUsage, recordUsage, type UsageAction } from "@/lib/auth/usage";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/api/rate-limit";
import { RATE_LIMIT_WINDOW_MS } from "@/lib/resume/constants";

/** 登录用户优先按用户月度额度限流，未登录回退 IP 限流 */
export async function enforceRateLimit(
  request: Request,
  action: UsageAction,
  ipLimit: number,
): Promise<Response | null> {
  const session = await getSessionFromRequest(request);
  if (session) {
    const usage = await checkMonthlyUsage(session.userId, action);
    if (!usage.allowed) {
      return rateLimitResponse(usage.retryAfterSec);
    }
    return null;
  }

  const ip = getClientIp(request);
  const rate = checkRateLimit(
    `${action}:${ip}`,
    ipLimit,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSec);
  }
  return null;
}

/** 在请求成功后记录登录用户用量（不阻塞主流程） */
export function trackUsage(request: Request, action: UsageAction) {
  void getSessionFromRequest(request).then((session) => {
    if (session) recordUsage(session.userId, action);
  });
}
