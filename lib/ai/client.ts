import type { CoverLetterResult, OptimizeMode, OptimizeResult } from "@/lib/types/resume";

/** OpenAI 兼容 API 默认地址，可通过 OPENAI_BASE_URL 覆盖（如 DeepSeek） */
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

function getAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL;
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error(
      "未配置 OPENAI_API_KEY，请在 .env.local 中设置后重启开发服务器",
    );
  }

  return { apiKey, baseUrl, model };
}

function buildChatBody(
  prompt: string,
  stream: boolean,
  system = "你是专业的简历优化顾问，只输出合法 JSON，不要输出任何其他文字。",
) {
  const { model } = getAIConfig();
  return {
    model,
    temperature: 0.4,
    stream,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  };
}

/**
 * 调用大模型进行简历优化分析。
 * 要求服务端配置 OPENAI_API_KEY，返回结构化 JSON 结果。
 */
export async function callOptimizeAI(
  prompt: string,
  mode: OptimizeMode = "general",
): Promise<OptimizeResult> {
  return callOptimizeAIStream(prompt, mode);
}

/**
 * 流式调用大模型，通过 onProgress 回传已生成字符数。
 */
export async function callOptimizeAIStream(
  prompt: string,
  mode: OptimizeMode = "general",
  onProgress?: (chars: number) => void,
  signal?: AbortSignal,
): Promise<OptimizeResult> {
  const { apiKey, baseUrl } = getAIConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildChatBody(prompt, true)),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseAIError(response.status, errorText));
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取 AI 响应流");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException("请求已取消", "AbortError");
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const payload = trimmed.slice(6);
      if (payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onProgress?.(fullContent.length);
        }
      } catch {
        // 忽略无法解析的 SSE 片段
      }
    }
  }

  if (!fullContent) {
    throw new Error("AI 返回内容为空");
  }

  let raw: Partial<OptimizeResult>;
  try {
    raw = JSON.parse(fullContent) as Partial<OptimizeResult>;
  } catch {
    throw new Error("AI 返回格式异常，请重试");
  }

  return normalizeResult(raw, mode);
}

/** 根据简历与 JD 生成求职信 */
export async function callCoverLetterAI(
  prompt: string,
  signal?: AbortSignal,
): Promise<CoverLetterResult> {
  const { apiKey, baseUrl } = getAIConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(
      buildChatBody(
        prompt,
        false,
        "你是专业的求职顾问，只输出合法 JSON，不要输出任何其他文字。",
      ),
    ),
    signal,
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

  let raw: Partial<CoverLetterResult>;
  try {
    raw = JSON.parse(content) as Partial<CoverLetterResult>;
  } catch {
    throw new Error("AI 返回格式异常，请重试");
  }

  if (!raw.fullText?.trim()) {
    throw new Error("AI 未生成求职信内容，请重试");
  }

  return {
    fullText: raw.fullText.trim(),
    highlights: raw.highlights ?? [],
  };
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
