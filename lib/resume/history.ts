import { apiFetch } from "@/lib/api/client";
import type {
  CoverLetterResult,
  HistoryRecord,
  OptimizeMode,
  OptimizeResult,
  ResumeTemplateId,
} from "@/lib/types/resume";

/** 从服务端加载历史记录 */
export async function fetchHistory(input?: {
  q?: string;
  projectId?: string;
}): Promise<HistoryRecord[]> {
  const params = new URLSearchParams();
  if (input?.q) params.set("q", input.q);
  if (input?.projectId) params.set("projectId", input.projectId);
  const query = params.toString();
  const data = await apiFetch<{ records: HistoryRecord[] }>(
    `/api/history${query ? `?${query}` : ""}`,
  );
  return data.records;
}

/** 保存一条优化记录 */
export async function saveHistoryRecord(input: {
  mode: OptimizeMode;
  resume: string;
  jobDescription?: string;
  result: OptimizeResult;
  title?: string;
  projectId?: string;
  company?: string;
  jobTitle?: string;
}): Promise<HistoryRecord> {
  const data = await apiFetch<{ record: HistoryRecord }>("/api/history", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.record;
}

/** 将求职信附加到已有历史记录 */
export async function updateHistoryCoverLetter(
  id: string,
  coverLetter: CoverLetterResult,
): Promise<HistoryRecord[]> {
  await apiFetch(`/api/history/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ coverLetter }),
  });
  return fetchHistory();
}

/** 更新历史记录中的简历模板选择 */
export async function updateHistoryTemplate(
  id: string,
  templateId: ResumeTemplateId,
): Promise<HistoryRecord[]> {
  await apiFetch(`/api/history/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ resumeTemplateId: templateId }),
  });
  return fetchHistory();
}

/** 更新历史记录标题或关联项目 */
export async function updateHistoryMeta(
  id: string,
  input: { title?: string; projectId?: string | null },
): Promise<HistoryRecord[]> {
  await apiFetch(`/api/history/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return fetchHistory();
}

/** 删除一条历史记录 */
export async function deleteHistoryRecord(id: string): Promise<HistoryRecord[]> {
  await apiFetch(`/api/history/${id}`, { method: "DELETE" });
  return fetchHistory();
}

/** 清空全部历史记录 */
export async function clearHistory(): Promise<void> {
  await apiFetch("/api/history", { method: "DELETE" });
}

/** 格式化为「今天 14:30」或「6/22 14:30」 */
export function formatHistoryTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `今天 ${time}`;

  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
