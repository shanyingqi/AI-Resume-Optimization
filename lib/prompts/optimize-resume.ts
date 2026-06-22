import type { OptimizeMode } from "@/lib/types/resume";

export function buildOptimizePrompt(
  resume: string,
  jobDescription: string | undefined,
  mode: OptimizeMode,
): string {
  const modeHint =
    mode === "targeted" && jobDescription
      ? `针对以下目标岗位 JD 进行定向优化，突出匹配度与关键词：\n${jobDescription}`
      : "进行通用简历优化，提升专业度、可读性与成果表达。";

  return `你是一位资深 HR 与职业规划顾问，擅长简历优化与 ATS（应聘者追踪系统）友好写法。

${modeHint}

请分析以下简历，并以 JSON 格式返回结果（不要包含 markdown 代码块）：

{
  "score": 0-100 的整数评分,
  "summary": "一句话总评",
  "issues": [
    {
      "section": "问题所在模块，如：工作经历、项目经历、技能",
      "severity": "high | medium | low",
      "problem": "具体问题",
      "suggestion": "改进建议"
    }
  ],
  "optimizedSections": [
    {
      "title": "模块名称",
      "original": "原文摘录（简短）",
      "optimized": "优化后的完整表述"
    }
  ],
  "keywords": ["建议补充或强化的关键词"],
  "tips": ["3-5 条 actionable 的求职建议"]
}

要求：
1. issues 列出 3-6 条最重要的问题
2. optimizedSections 给出 2-4 个核心模块的改写示例
3. 使用 STAR 法则强化成果，尽量量化（数字、百分比、规模）
4. 避免空洞形容词，用动词开头描述职责与成果
5. 全部使用中文回复

简历原文：
---
${resume}
---`;
}
