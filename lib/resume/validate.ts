import { moderateText, moderateTextAsync } from "@/lib/content/moderation";
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
  projectId?: string,
): string | null {
  const resumeError = validateResumeLength(resume);
  if (resumeError) return resumeError;

  const resumeContentError = moderateText(resume);
  if (resumeContentError) return resumeContentError;

  if (mode === "targeted") {
    if (!projectId) {
      return "JD 定向优化需先选择求职项目";
    }
    if (!jobDescription?.trim()) {
      return "所选求职项目缺少岗位 JD，请先在项目中补充";
    }
  }

  const jdLengthError = validateJobDescriptionLength(jobDescription);
  if (jdLengthError) return jdLengthError;

  if (jobDescription?.trim()) {
    return moderateText(jobDescription);
  }

  return null;
}

// 验证求职信输入
export function validateCoverLetterInput(
  resume: string,
  jobDescription: string,
): string | null {
  const resumeError = validateResumeLength(resume);
  if (resumeError) return resumeError;

  const resumeContentError = moderateText(resume);
  if (resumeContentError) return resumeContentError;

  if (!jobDescription?.trim()) {
    return "生成求职信需要提供目标岗位 JD";
  }

  const jdLengthError = validateJobDescriptionLength(jobDescription);
  if (jdLengthError) return jdLengthError;

  return moderateText(jobDescription);
}

/** 服务端：优化输入校验 + 可选第三方内容审核 */
export async function validateOptimizeInputAsync(
  resume: string,
  jobDescription: string | undefined,
  mode: OptimizeMode,
  projectId?: string,
): Promise<string | null> {
  const syncError = validateOptimizeInput(
    resume,
    jobDescription,
    mode,
    projectId,
  );
  if (syncError) return syncError;

  const resumeRemote = await moderateTextAsync(resume);
  if (resumeRemote) return resumeRemote;

  if (jobDescription?.trim()) {
    return moderateTextAsync(jobDescription);
  }

  return null;
}

/** 服务端：求职信输入校验 + 可选第三方内容审核 */
export async function validateCoverLetterInputAsync(
  resume: string,
  jobDescription: string,
): Promise<string | null> {
  const syncError = validateCoverLetterInput(resume, jobDescription);
  if (syncError) return syncError;

  const resumeRemote = await moderateTextAsync(resume);
  if (resumeRemote) return resumeRemote;

  return moderateTextAsync(jobDescription);
}
