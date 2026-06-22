export type OptimizeMode = "general" | "targeted";

export interface OptimizeRequest {
  resume: string;
  jobDescription?: string;
  mode: OptimizeMode;
}

export interface ResumeIssue {
  section: string;
  severity: "high" | "medium" | "low";
  problem: string;
  suggestion: string;
}

export interface OptimizedSection {
  title: string;
  original: string;
  optimized: string;
}

export interface OptimizeResult {
  score: number;
  summary: string;
  /** JD 定向模式下的岗位匹配度 0-100 */
  jdMatchRate?: number;
  /** JD 匹配度简要说明 */
  jdMatchSummary?: string;
  /** 完整优化版简历全文，用于左右对比 */
  fullOptimizedResume: string;
  issues: ResumeIssue[];
  optimizedSections: OptimizedSection[];
  keywords: string[];
  tips: string[];
}

export interface HistoryRecord {
  id: string;
  createdAt: string;
  mode: OptimizeMode;
  resumePreview: string;
  jobDescriptionPreview?: string;
  score: number;
  jdMatchRate?: number;
  summary: string;
  resume: string;
  jobDescription?: string;
  result: OptimizeResult;
}
