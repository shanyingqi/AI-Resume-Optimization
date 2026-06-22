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
  issues: ResumeIssue[];
  optimizedSections: OptimizedSection[];
  keywords: string[];
  tips: string[];
}
