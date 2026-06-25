import type { ChatContext } from "@/lib/types/chat";
import type { JobApplicationDetail, JobApplicationSummary } from "@/lib/types/project";
import type { HistoryRecord, OptimizeResult } from "@/lib/types/resume";

/** 客户端专用字段，不写入服务端 */
export type DraftChatPayload = ChatContext & {
  autoMessage?: string;
};

function buildOptimizeSummary(record: HistoryRecord): string {
  const parts = [record.summary];
  if (record.score) parts.push(`综合评分 ${record.score}`);
  if (record.jdMatchRate != null) parts.push(`JD 匹配 ${record.jdMatchRate}%`);
  const issues = record.result?.issues
    ?.slice(0, 3)
    .map((item) => item.problem || item.suggestion)
    .filter(Boolean);
  if (issues?.length) parts.push(`主要问题：${issues.join("；")}`);
  return parts.filter(Boolean).join("。");
}

function defaultAutoMessage(record: HistoryRecord): string {
  if (record.jdMatchRate != null) {
    return "请结合刚才的 JD 定向优化结果，告诉我还有哪些地方可以针对性加强？";
  }
  return "请根据刚才的简历优化结果，帮我总结主要问题并给出具体改写建议。";
}

export function defaultAutoMessageFromResult(
  result: OptimizeResult,
  mode: "general" | "targeted",
): string {
  if (mode === "targeted") {
    return "请结合刚才的 JD 定向优化结果，告诉我还有哪些地方可以针对性加强？";
  }
  return "请根据刚才的简历优化结果，帮我总结主要问题并给出具体改写建议。";
}

/** 从历史优化记录构建对话上下文 */
export function buildChatContextFromHistory(record: HistoryRecord): DraftChatPayload {
  return {
    resume: record.resume,
    jobDescription: record.jobDescription,
    optimizeSummary: buildOptimizeSummary(record),
    historyId: record.id,
    projectId: record.projectId,
    projectTitle: record.projectTitle,
    autoMessage: defaultAutoMessage(record),
  };
}

/** 从求职项目构建对话上下文 */
export function buildChatContextFromProject(
  project: JobApplicationDetail,
  resume?: string,
): DraftChatPayload {
  const title = project.company
    ? `${project.company} · ${project.title}`
    : project.title;

  return {
    resume: resume?.trim() || undefined,
    jobDescription: project.jobDescription,
    optimizeSummary: `当前讨论求职项目「${title}」`,
    projectId: project.id,
    projectTitle: title,
    autoMessage: project.jobDescription?.trim()
      ? `我想应聘「${title}」这个岗位，请结合 JD 帮我分析简历匹配度和改进方向。`
      : `我想应聘「${title}」这个岗位，请帮我梳理简历和求职准备的重点。`,
  };
}

export function projectLabel(project: JobApplicationSummary): string {
  return project.company ? `${project.company} · ${project.title}` : project.title;
}

/** 下拉选项文案，同名岗位用创建日期区分 */
export function projectOptionLabel(
  project: JobApplicationSummary,
  projects: JobApplicationSummary[],
): string {
  const base = projectLabel(project);
  const duplicates = projects.filter(
    (item) =>
      item.title === project.title &&
      (item.company ?? "") === (project.company ?? ""),
  );
  if (duplicates.length <= 1) return base;
  const date = new Date(project.createdAt).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
  return `${base}（${date}）`;
}

/** 持久化前移除仅客户端使用的字段 */
export function stripClientChatFields(
  context?: ChatContext | DraftChatPayload,
): ChatContext | undefined {
  if (!context) return undefined;
  const { autoMessage: _, ...rest } = context as DraftChatPayload;
  return rest;
}
