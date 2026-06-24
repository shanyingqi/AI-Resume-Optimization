import { apiFetch } from "@/lib/api/client";
import type {
  CoverLetterResult,
  HistoryRecord,
  OptimizeMode,
  OptimizeResult,
  ResumeTemplateId,
} from "@/lib/types/resume";

/** 从服务端加载历史记录 */
export async function fetchHistory(): Promise<HistoryRecord[]> {
  const data = await apiFetch<{ records: HistoryRecord[] }>("/api/history");
  return data.records;
}

/** 保存一条优化记录 */
export async function saveHistoryRecord(input: {
  mode: OptimizeMode;
  resume: string;
  jobDescription?: string;
  result: OptimizeResult;
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
