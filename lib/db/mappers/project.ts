import type {
  JobApplication,
  OptimizationHistory,
  ResumeProfile,
  ResumeVersion,
} from "@prisma/client";
import type {
  JobApplicationDetail,
  JobApplicationStatus,
  JobApplicationSummary,
  ResumeProfile as ResumeProfileType,
  ResumeVersion as ResumeVersionType,
} from "@/lib/types/project";

// 预览文本
function preview(text: string, max = 80): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

// 将数据库简历配置映射为简历配置
export function toResumeProfile(row: ResumeProfile): ResumeProfileType {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// 将数据库简历版本映射为简历版本
export function toResumeVersion(row: ResumeVersion): ResumeVersionType {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    source: row.source as ResumeVersionType["source"],
    historyId: row.historyId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

// 数据库求职项目行
type ProjectRow = JobApplication & {
  _count?: { historyRecords: number; chatSessions: number };
  historyRecords?: Pick<OptimizationHistory, "score" | "jdMatchRate" | "createdAt">[];
};

// 将数据库求职项目映射为求职项目摘要
export function toJobApplicationSummary(row: ProjectRow): JobApplicationSummary {
  const latest = row.historyRecords?.[0];
  return {
    id: row.id,
    title: row.title,
    company: row.company ?? undefined,
    status: row.status as JobApplicationStatus,
    jobDescriptionPreview: row.jobDescription
      ? preview(row.jobDescription)
      : undefined,
    historyCount: row._count?.historyRecords ?? row.historyRecords?.length ?? 0,
    chatCount: row._count?.chatSessions ?? 0,
    latestScore: latest?.score,
    latestJdMatchRate: latest?.jdMatchRate ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// 将数据库求职项目映射为求职项目详情
export function toJobApplicationDetail(
  row: JobApplication & {
    historyRecords: { id: string }[];
    chatSessions: { id: string }[];
  },
  summary: JobApplicationSummary,
): JobApplicationDetail {
  return {
    ...summary,
    jobDescription: row.jobDescription ?? undefined,
    notes: row.notes ?? undefined,
    resumeVersionId: row.resumeVersionId ?? undefined,
    historyIds: row.historyRecords.map((h) => h.id),
    chatSessionIds: row.chatSessions.map((s) => s.id),
  };
}

// 生成默认历史记录标题
export function defaultHistoryTitle(input: {
  mode: string;
  company?: string | null;
  title?: string | null;
  jobDescription?: string | null;
}): string {
  if (input.company && input.title) {
    return `${input.company} · ${input.title}`;
  }
  if (input.title) return input.title;
  if (input.mode === "targeted" && input.jobDescription) {
    return `JD 定向 · ${preview(input.jobDescription, 40)}`;
  }
  return "通用优化";
}
