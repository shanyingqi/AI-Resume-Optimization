import { authErrorResponse, requireUser } from "@/lib/auth/require-user";
import { getUsageSummary } from "@/lib/auth/usage";
import { errorResponse, jsonResponse } from "@/lib/api/json";

/** 获取当前用户当月用量 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const usage = await getUsageSummary(user.id);
    return jsonResponse({ usage });
  } catch (error) {
    return authErrorResponse(error) ?? errorResponse("服务器错误", 500);
  }
}
