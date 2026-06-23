import { HISTORY_STORAGE_KEY, MAX_HISTORY_RECORDS } from "@/lib/resume/constants";
import type { CoverLetterResult, HistoryRecord, OptimizeMode, OptimizeResult } from "@/lib/types/resume";

function preview(text: string, max = 80): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

/** 从 localStorage 读取历史记录列表 */
export function loadHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const records = JSON.parse(raw) as HistoryRecord[];
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

/** 保存一条优化记录，超出上限时丢弃最旧的记录 */
export function saveHistoryRecord(input: {
  mode: OptimizeMode;
  resume: string;
  jobDescription?: string;
  result: OptimizeResult;
}): HistoryRecord {
  const record: HistoryRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode: input.mode,
    resumePreview: preview(input.resume),
    jobDescriptionPreview: input.jobDescription
      ? preview(input.jobDescription)
      : undefined,
    score: input.result.score,
    jdMatchRate: input.result.jdMatchRate,
    summary: input.result.summary,
    resume: input.resume,
    jobDescription: input.jobDescription,
    result: input.result,
  };

  const existing = loadHistory();
  const next = [record, ...existing].slice(0, MAX_HISTORY_RECORDS);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  return record;
}

/** 将求职信附加到已有历史记录 */
export function updateHistoryCoverLetter(
  id: string,
  coverLetter: CoverLetterResult,
): HistoryRecord[] {
  const next = loadHistory().map((record) =>
    record.id === id ? { ...record, coverLetter } : record,
  );
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** 删除一条历史记录 */
export function deleteHistoryRecord(id: string): HistoryRecord[] {
  const next = loadHistory().filter((r) => r.id !== id);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
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
