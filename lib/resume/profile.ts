import { apiFetch } from "@/lib/api/client";
import type { ResumeProfile } from "@/lib/types/project";

// 获取简历配置
export async function fetchResumeProfile(): Promise<ResumeProfile | null> {
  const data = await apiFetch<{ profile: ResumeProfile | null }>(
    "/api/resume-profile",
  );
  return data.profile;
}

// 保存简历配置
export async function saveResumeProfile(input: {
  title?: string;
  content: string;
}): Promise<ResumeProfile> {
  const data = await apiFetch<{ profile: ResumeProfile }>("/api/resume-profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data.profile;
}
