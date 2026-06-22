import type { OptimizeMode } from "@/lib/types/resume";

export function buildOptimizePrompt(
  resume: string,
  jobDescription: string | undefined,
  mode: OptimizeMode,
): string {
  const isTargeted = mode === "targeted" && jobDescription;

  const modeHint = isTargeted
    ? `针对以下目标岗位 JD 进行定向优化，突出匹配度与关键词：\n${jobDescription}`
    : "进行通用简历优化，提升专业度、可读性与成果表达。";

  const jdFields = isTargeted
    ? `
  "jdMatchRate": 0-100 的整数，表示简历与 JD 的匹配度百分比,
  "jdMatchSummary": "一句话说明匹配情况，指出已匹配和缺失的关键点",`
    : "";

  const jdRequirements = isTargeted
    ? `
6. jdMatchRate 需客观评估：技能匹配、经历相关性、关键词覆盖、年限要求等
7. jdMatchSummary 需指出 JD 中已覆盖和仍缺失的 2-3 个关键点`
    : "";

  return `你是一位资深 HR 与职业规划顾问，擅长简历优化与 ATS（应聘者追踪系统）友好写法。

${modeHint}

请分析以下简历，并以 JSON 格式返回结果（不要包含 markdown 代码块）：

{
  "score": 0-100 的整数评分（简历整体质量）,${jdFields}
  "summary": "一句话总评",
  "fullOptimizedResume": "基于原文生成的完整优化版简历全文，保留原有结构（个人信息、经历、技能等），对所有模块进行专业改写，可直接使用",
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
3. fullOptimizedResume 必须是完整简历，不是片段拼接说明
4. 使用 STAR 法则强化成果，尽量量化（数字、百分比、规模）
5. 避免空洞形容词，用动词开头描述职责与成果${jdRequirements}
6. 全部使用中文回复

简历原文：
---
${resume}
---`;
}
