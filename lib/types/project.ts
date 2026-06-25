export type JobApplicationStatus =
  | "active"
  | "applied"
  | "interviewing"
  | "closed";

export interface ResumeProfile {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
}

export interface ResumeVersion {
  id: string;
  title: string;
  content: string;
  source: "manual" | "optimize" | "import";
  historyId?: string;
  createdAt: string;
}

export interface JobApplicationSummary {
  id: string;
  title: string;
  company?: string;
  status: JobApplicationStatus;
  jobDescriptionPreview?: string;
  historyCount: number;
  chatCount: number;
  latestScore?: number;
  latestJdMatchRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplicationDetail extends JobApplicationSummary {
  jobDescription?: string;
  notes?: string;
  resumeVersionId?: string;
  historyIds: string[];
  chatSessionIds: string[];
}

export interface UsageSummary {
  periodStart: string;
  optimize: { used: number; limit: number };
  chat: { used: number; limit: number };
  parse: { used: number; limit: number };
  coverLetter: { used: number; limit: number };
  history: { used: number; limit: number };
}
