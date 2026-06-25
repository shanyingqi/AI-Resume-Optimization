import { apiFetch } from "@/lib/api/client";
import type {
  JobApplicationDetail,
  JobApplicationStatus,
  JobApplicationSummary,
  UsageSummary,
} from "@/lib/types/project";
import type { HistoryRecord } from "@/lib/types/resume";

// 获取求职项目列表
export async function fetchProjects(input?: {
  status?: JobApplicationStatus;
  q?: string;
}): Promise<JobApplicationSummary[]> {
  const params = new URLSearchParams();
  if (input?.status) params.set("status", input.status);
  if (input?.q) params.set("q", input.q);
  const query = params.toString();
  const data = await apiFetch<{ projects: JobApplicationSummary[] }>(
    `/api/projects${query ? `?${query}` : ""}`,
    { timeoutMs: 30_000 },
  );
  return data.projects;
}

// 获取求职项目详情
export async function fetchProject(id: string): Promise<JobApplicationDetail> {
  const data = await apiFetch<{ project: JobApplicationDetail }>(
    `/api/projects/${id}`,
  );
  return data.project;
}

// 创建求职项目
export async function createProject(input: {
  title: string;
  company?: string;
  jobDescription?: string;
  status?: JobApplicationStatus;
  historyId?: string;
  notes?: string;
}): Promise<JobApplicationSummary> {
  const data = await apiFetch<{ project: JobApplicationSummary }>(
    "/api/projects",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.project;
}

// 更新求职项目
export async function updateProject(
  id: string,
  input: {
    title?: string;
    company?: string | null;
    jobDescription?: string | null;
    status?: JobApplicationStatus;
    notes?: string | null;
  },
): Promise<JobApplicationDetail> {
  const data = await apiFetch<{ project: JobApplicationDetail }>(
    `/api/projects/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return data.project;
}

// 删除求职项目
export async function deleteProject(id: string): Promise<void> {
  await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
}

// 获取使用情况
export async function fetchUsage(): Promise<UsageSummary> {
  const data = await apiFetch<{ usage: UsageSummary }>("/api/auth/usage");
  return data.usage;
}

// 比较历史记录
export async function compareHistory(
  leftId: string,
  rightId: string,
): Promise<{ left: HistoryRecord; right: HistoryRecord }> {
  return apiFetch<{ left: HistoryRecord; right: HistoryRecord }>(
    `/api/history/compare?left=${encodeURIComponent(leftId)}&right=${encodeURIComponent(rightId)}`,
  );
}
