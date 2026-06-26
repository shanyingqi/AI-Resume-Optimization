/**
 * 第三方内容审核接入层。
 *
 * 启用方式（.env）：
 *   MODERATION_ENABLED=true
 *   MODERATION_PROVIDER=openai          # 目前支持 openai
 *   MODERATION_API_KEY=sk-...           # 可单独配置；缺省回退 OPENAI_API_KEY
 *   MODERATION_BASE_URL=https://api.openai.com/v1
 */

const DEFAULT_OPENAI_MODERATION_URL = "https://api.openai.com/v1";

// 检查是否启用第三方文本审核
export function isModerationEnabled(): boolean {
  return process.env.MODERATION_ENABLED === "true";
}

// 获取第三方文本审核配置
function getModerationConfig() {
  const apiKey =
    process.env.MODERATION_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";
  const baseUrl = (
    process.env.MODERATION_BASE_URL?.trim() || DEFAULT_OPENAI_MODERATION_URL
  ).replace(/\/$/, "");

  return { apiKey, baseUrl };
}

interface OpenAIModerationResponse {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
  }>;
}

/** 调用 OpenAI Moderation API 审核文本 */
async function moderateWithOpenAI(text: string): Promise<string | null> {
  const { apiKey, baseUrl } = getModerationConfig();
  if (!apiKey) {
    console.warn("[moderation] MODERATION_ENABLED=true 但未配置 API Key");
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) return null;

  // 避免超长文本浪费额度；本地敏感词已先拦一层
  const input = trimmed.length > 8000 ? trimmed.slice(0, 8000) : trimmed;

  try {
    const response = await fetch(`${baseUrl}/moderations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[moderation] OpenAI 请求失败:", response.status, detail);
      return null;
    }

    const data = (await response.json()) as OpenAIModerationResponse;
    const result = data.results?.[0];
    if (!result?.flagged) return null;

    const hit = Object.entries(result.categories ?? {}).find(([, v]) => v);
    if (hit) {
      console.info("[moderation] flagged category:", hit[0]);
    }

    return "内容包含违规信息，请修改后重试";
  } catch (error) {
    console.error("[moderation] 调用异常:", error);
    return null;
  }
}

/**
 * 第三方文本审核。未启用或调用失败时返回 null（不阻断业务，仅记录日志）。
 * 若需「审核失败则拒绝」，可将失败分支改为返回固定错误文案。
 */
export async function moderateWithProvider(text: string): Promise<string | null> {
  if (!isModerationEnabled()) return null;

  const provider = process.env.MODERATION_PROVIDER?.trim() || "openai";
  switch (provider) {
    case "openai":
      return moderateWithOpenAI(text);
    default:
      console.warn(`[moderation] 未知提供商: ${provider}`);
      return null;
  }
}
