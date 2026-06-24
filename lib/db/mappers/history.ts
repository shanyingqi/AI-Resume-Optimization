import type { OptimizationHistory } from "@prisma/client";
import type {
  CoverLetterResult,
  HistoryRecord,
  OptimizeMode,
  OptimizeResult,
  ResumeTemplateId,
} from "@/lib/types/resume";

// 将数据库历史记录映射为历史记录
export function toHistoryRecord(row: OptimizationHistory): HistoryRecord {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
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
  };
}
