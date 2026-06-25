import type { OptimizationHistory } from "@prisma/client";
import type {
  CoverLetterResult,
  HistoryRecord,
  OptimizeMode,
  OptimizeResult,
  ResumeTemplateId,
} from "@/lib/types/resume";

type HistoryRow = OptimizationHistory & {
  project?: { title: string; company: string | null } | null;
};

// 将数据库历史记录映射为历史记录
export function toHistoryRecord(row: HistoryRow): HistoryRecord {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    title: row.title ?? undefined,
    mode: row.mode as OptimizeMode,
    resumePreview: row.resumePreview,
    jobDescriptionPreview: row.jobDescriptionPreview ?? undefined,
    score: row.score,
    jdMatchRate: row.jdMatchRate ?? undefined,
    summary: row.summary,
    resume: row.resume,
    jobDescription: row.jobDescription ?? undefined,
    result: row.result as unknown as OptimizeResult,
    coverLetter: row.coverLetter
      ? (row.coverLetter as unknown as CoverLetterResult)
      : undefined,
    resumeTemplateId: row.resumeTemplateId
      ? (row.resumeTemplateId as ResumeTemplateId)
      : undefined,
    projectId: row.projectId ?? undefined,
    projectTitle: row.project
      ? row.project.company
        ? `${row.project.company} · ${row.project.title}`
        : row.project.title
      : undefined,
  };
}
