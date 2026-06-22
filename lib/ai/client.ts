import type { OptimizeResult } from "@/lib/types/resume";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

export async function callOptimizeAI(prompt: string): Promise<OptimizeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL;
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  if (!apiKey) {
    return getMockResult();
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

  return JSON.parse(content) as OptimizeResult;
}

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

function getMockResult(): OptimizeResult {
  return {
    score: 72,
    summary:
      "简历结构基本完整，但成果量化不足、关键词密度偏低，建议按 STAR 法则重写核心经历。",
    issues: [
      {
        section: "工作经历",
        severity: "high",
        problem: "职责描述偏多，缺少可量化的业务成果",
        suggestion:
          "每条经历补充 1-2 个数字指标，如「提升转化率 23%」「支撑日活 50 万+」",
      },
      {
        section: "项目经历",
        severity: "medium",
        problem: "技术栈罗列为主，未体现个人贡献与难点",
        suggestion: "明确你在团队中的角色、负责模块、以及解决的关键技术问题",
      },
      {
        section: "技能",
        severity: "low",
        problem: "技能列表未与目标岗位对齐",
        suggestion: "将 JD 中的核心技能前置，并标注熟练程度",
      },
    ],
    optimizedSections: [
      {
        title: "工作经历示例",
        original: "负责公司官网开发与维护",
        optimized:
          "主导公司官网重构（Next.js + TypeScript），将首屏加载时间从 3.2s 降至 1.1s（-66%），SEO 自然流量季度增长 40%",
      },
      {
        title: "项目经历示例",
        original: "参与电商后台管理系统开发",
        optimized:
          "作为核心开发负责订单与库存模块，设计 RESTful API 并完成 Redis 缓存方案，支撑双 11 期间峰值 QPS 8000+，接口 P99 延迟 < 120ms",
      },
    ],
    keywords: ["React", "TypeScript", "性能优化", "微服务", "敏捷开发"],
    tips: [
      "将最核心的 2-3 段经历放在简历前 1/3 区域",
      "每段经历控制在 3-5 个要点，避免大段文字",
      "投递前根据 JD 微调关键词，但勿堆砌造假",
      "附 GitHub / 作品集链接可显著提升技术岗通过率",
    ],
  };
}
