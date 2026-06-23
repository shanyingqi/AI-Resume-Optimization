"use client";

import { useState } from "react";
import AppModal from "./AppModal";
import {
  clearHistory,
  deleteHistoryRecord,
  formatHistoryTime,
} from "@/lib/resume/history";
import { RESUME_TEMPLATES } from "@/app/components/resume-templates/registry";
import type { HistoryRecord } from "@/lib/types/resume";

interface HistoryPanelProps {
  records: HistoryRecord[];
  activeId?: string;
  onRecordsChange: (records: HistoryRecord[]) => void;
  onRestore: (record: HistoryRecord) => void;
}

// 历史记录面板，显示最近优化记录，支持删除和恢复
export default function HistoryPanel({
  records,
  activeId,
  onRecordsChange,
  onRestore,
}: HistoryPanelProps) {
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // 删除历史记录
  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onRecordsChange(deleteHistoryRecord(id));
  }

  // 清空全部历史记录
  function handleClear() {
    if (!records.length) return;
    setClearConfirmOpen(true);
  }

  // 确认清空全部历史记录
  function confirmClear() {
    clearHistory();
    onRecordsChange([]);
    setClearConfirmOpen(false);
  }

  return (
    <>
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">历史记录</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            最近 {records.length} 条记录，点击可恢复优化结果与求职信
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
                      {record.coverLetter && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          含求职信
                        </span>
                      )}
                      {record.result.structuredResume && (
                        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                          可模板导出
                        </span>
                      )}
                      {record.resumeTemplateId && record.resumeTemplateId !== "classic" && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {RESUME_TEMPLATES.find((t) => t.id === record.resumeTemplateId)?.name ??
                            "自定义模板"}
                        </span>
                      )}
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

    <AppModal
      open={clearConfirmOpen}
      title="清空历史记录"
      message="确定清空全部历史记录？此操作不可恢复。"
      type="confirm"
      confirmLabel="清空"
      cancelLabel="取消"
      variant="danger"
      onConfirm={confirmClear}
      onCancel={() => setClearConfirmOpen(false)}
    />
    </>
  );
}
