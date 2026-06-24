import { clearSessionCookie } from "@/lib/auth/session";
import { jsonResponse } from "@/lib/api/json";

/** 用户登出 */
export async function POST() {
  await clearSessionCookie();
  return jsonResponse({ ok: true });
}
