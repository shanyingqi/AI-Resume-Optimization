import type { OptimizeMode, OptimizeResult } from "@/lib/types/resume";

/** OpenAI 兼容 API 默认地址，可通过 OPENAI_BASE_URL 覆盖（如 DeepSeek） */
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * 调用大模型进行简历优化分析。
 * 要求服务端配置 OPENAI_API_KEY，返回结构化 JSON 结果。
 */
export async function callOptimizeAI(
  prompt: string,
  mode: OptimizeMode = "general",
): Promise<OptimizeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL;
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error(
      "未配置 OPENAI_API_KEY，请在 .env.local 中设置后重启开发服务器",
    );
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      // 强制 JSON 输出，便于解析为 OptimizeResult
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是专业的简历优化顾问，只输出合法 JSON，不要输出任何其他文字。",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseAIError(response.status, errorText));
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI 返回内容为空");
  }

  return normalizeResult(JSON.parse(content) as Partial<OptimizeResult>, mode);
}

/** 补全 AI 可能缺失的字段，定向模式下保留 JD 匹配相关字段 */
function normalizeResult(
  raw: Partial<OptimizeResult>,
  mode: OptimizeMode,
): OptimizeResult {
  const optimizedSections = raw.optimizedSections ?? [];
  const fallbackResume = optimizedSections
    .map((s) => `【${s.title}】\n${s.optimized}`)
    .join("\n\n");

  return {
    score: raw.score ?? 0,
    summary: raw.summary ?? "",
    jdMatchRate: mode === "targeted" ? raw.jdMatchRate : undefined,
    jdMatchSummary: mode === "targeted" ? raw.jdMatchSummary : undefined,
    fullOptimizedResume: raw.fullOptimizedResume?.trim() || fallbackResume,
    issues: raw.issues ?? [],
    optimizedSections,
    keywords: raw.keywords ?? [],
    tips: raw.tips ?? [],
  };
}

/** 将 API 错误响应转为用户可读的中文提示 */
function parseAIError(status: number, errorText: string): string {
  try {
    const body = JSON.parse(errorText) as {
      error?: { message?: string; code?: string };
    };
    const message = body.error?.message ?? "";

    if (message.includes("Insufficient Balance") || status === 402) {
      return "DeepSeek 账户余额不足，请前往 https://platform.deepseek.com 充值后再试";
    }
    if (message.includes("invalid_api_key") || status === 401) {
      return "API Key 无效，请检查 .env.local 中的 OPENAI_API_KEY 是否正确";
    }
    if (message) {
      return `AI 请求失败: ${message}`;
    }
  } catch {
    // 非 JSON 响应，使用原始文本
  }

  return `AI 请求失败 (${status})，请稍后重试`;
}
