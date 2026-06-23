import {
  MAX_JD_CHARS,
  MAX_RESUME_CHARS,
} from "@/lib/resume/constants";
import type { OptimizeMode } from "@/lib/types/resume";

// 验证简历内容长度
export function validateResumeLength(resume: string): string | null {
  const len = resume.trim().length;
  if (len === 0) return "请提供简历内容";
  if (len > MAX_RESUME_CHARS) {
    return `简历内容不能超过 ${MAX_RESUME_CHARS.toLocaleString()} 字（当前 ${len.toLocaleString()} 字）`;
  }
  return null;
}

// 验证岗位 JD 长度
export function validateJobDescriptionLength(jd: string | undefined): string | null {
  const len = jd?.trim().length ?? 0;
  if (len > MAX_JD_CHARS) {
    return `岗位 JD 不能超过 ${MAX_JD_CHARS.toLocaleString()} 字（当前 ${len.toLocaleString()} 字）`;
  }
  return null;
}

// 验证优化输入
export function validateOptimizeInput(
  resume: string,
  jobDescription: string | undefined,
  mode: OptimizeMode,
): string | null {
  const resumeError = validateResumeLength(resume);
  if (resumeError) return resumeError;

  if (mode === "targeted" && !jobDescription?.trim()) {
    return "定向优化模式下请提供岗位 JD";
  }

  return validateJobDescriptionLength(jobDescription);
}

// 验证求职信输入
export function validateCoverLetterInput(
  resume: string,
  jobDescription: string,
): string | null {
  const resumeError = validateResumeLength(resume);
  if (resumeError) return resumeError;

  if (!jobDescription?.trim()) {
    return "生成求职信需要提供目标岗位 JD";
  }

  return validateJobDescriptionLength(jobDescription);
}
