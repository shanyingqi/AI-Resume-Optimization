import type { OptimizeResult } from "@/lib/types/resume";

export function formatOptimizeReport(result: OptimizeResult): string {
  const lines: string[] = [
    "=== AI 简历优化报告 ===",
    "",
    `综合评分：${result.score}/100`,
    ...(result.jdMatchRate != null
      ? [`JD 匹配度：${result.jdMatchRate}%`, `匹配说明：${result.jdMatchSummary ?? ""}`]
      : []),
    `总评：${result.summary}`,
    "",
    "--- 完整优化版简历 ---",
    result.fullOptimizedResume,
    "",
    "--- 问题诊断 ---",
    ...result.issues.map(
      (issue, i) =>
        `${i + 1}. [${issue.section}] (${issue.severity})\n   问题：${issue.problem}\n   建议：${issue.suggestion}`,
    ),
    "",
    "--- 改写示例 ---",
    ...result.optimizedSections.map(
      (section) =>
        `【${section.title}】\n原文：${section.original}\n优化：${section.optimized}`,
    ),
    "",
    "--- 建议关键词 ---",
    result.keywords.join("、"),
    "",
    "--- 求职建议 ---",
    ...result.tips.map((tip, i) => `${i + 1}. ${tip}`),
  ];

  return lines.join("\n");
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
