"use client";

import {
  clearHistory,
  deleteHistoryRecord,
  formatHistoryTime,
  loadHistory,
} from "@/lib/resume/history";
import type { HistoryRecord } from "@/lib/types/resume";

interface HistoryPanelProps {
  records: HistoryRecord[];
  activeId?: string;
  onRecordsChange: (records: HistoryRecord[]) => void;
  onRestore: (record: HistoryRecord) => void;
}

export default function HistoryPanel({
  records,
  activeId,
  onRecordsChange,
  onRestore,
}: HistoryPanelProps) {
  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onRecordsChange(deleteHistoryRecord(id));
  }

  function handleClear() {
    if (!records.length) return;
    if (confirm("确定清空全部历史记录？")) {
      clearHistory();
      onRecordsChange([]);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">历史记录</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            最近 {records.length} 条优化记录，点击可恢复查看
          </p>
        </div>
        {records.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-zinc-500 hover:text-red-600"
          >
            清空全部
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          暂无历史记录，完成一次优化后将自动保存
        </p>
      ) : (
        <ul className="space-y-2">
          {records.map((record) => (
            <li key={record.id}>
              <button
                type="button"
                onClick={() => onRestore(record)}
                className={`w-full rounded-lg border p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20 ${
                  activeId === record.id
                    ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                    : "border-zinc-100 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        评分 {record.score}
                      </span>
                      {record.jdMatchRate != null && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          JD 匹配 {record.jdMatchRate}%
                        </span>
                      )}
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {record.mode === "targeted" ? "定向优化" : "通用优化"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {record.resumePreview}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                      {record.summary}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-xs text-zinc-400">
                      {formatHistoryTime(record.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(record.id, e)}
                      className="text-xs text-zinc-400 hover:text-red-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
