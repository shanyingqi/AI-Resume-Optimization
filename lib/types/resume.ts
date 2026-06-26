/** 优化模式：通用优化 或 结合 JD 的定向优化 */
export type OptimizeMode = "general" | "targeted";

export interface OptimizeRequest {
  resume: string;
  jobDescription?: string;
  mode: OptimizeMode;
  projectId?: string;
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

/** 简历基本信息 */
export interface ResumeBasics {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
}

export interface ResumeExperience {
  company: string;
  role: string;
  period?: string;
  highlights: string[];
}

export interface ResumeEducation {
  school: string;
  degree?: string;
  major?: string;
  period?: string;
}

export interface ResumeProject {
  name: string;
  description?: string;
  highlights: string[];
  techStack?: string[];
}

export interface ResumeSkillGroup {
  category?: string;
  items: string[];
}

/** 结构化简历，用于模板预览与矢量 PDF 导出 */
export interface StructuredResume {
  basics: ResumeBasics;
  summary?: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  skills: ResumeSkillGroup[];
}

export type ResumeTemplateId = "classic" | "modern" | "sidebar";

/** AI 优化分析的完整返回结构 */
export interface OptimizeResult {
  score: number;
  summary: string;
  /** JD 定向模式下的岗位匹配度 0-100 */
  jdMatchRate?: number;
  /** JD 匹配度简要说明 */
  jdMatchSummary?: string;
  /** 完整优化版简历全文，用于左右对比 */
  fullOptimizedResume: string;
  /** 结构化简历，用于模板预览与导出 */
  structuredResume?: StructuredResume;
  issues: ResumeIssue[];
  optimizedSections: OptimizedSection[];
  keywords: string[];
  tips: string[];
}

export interface CoverLetterRequest {
  resume: string;
  jobDescription: string;
}

/** AI 生成的求职信 */
export interface CoverLetterResult {
  /** 完整求职信正文（含称呼与落款，可直接使用） */
  fullText: string;
  /** 与 JD 匹配的核心亮点（3-5 条） */
  highlights: string[];
}

/** 保存在数据库中的历史记录条目 */
export interface HistoryRecord {
  id: string;
  createdAt: string;
  title?: string;
  mode: OptimizeMode;
  resumePreview: string;
  jobDescriptionPreview?: string;
  score: number;
  jdMatchRate?: number;
  summary: string;
  resume: string;
  jobDescription?: string;
  result: OptimizeResult;
  /** 同一次优化会话中生成的求职信 */
  coverLetter?: CoverLetterResult;
  /** 用户选择的简历模板 */
  resumeTemplateId?: ResumeTemplateId;
  /** 关联的求职项目 */
  projectId?: string;
  projectTitle?: string;
}
