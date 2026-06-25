"use client";

import { useState } from "react";
import AppModal from "./AppModal";
import {
  clearHistory,
  deleteHistoryRecord,
  formatHistoryTime,
  updateHistoryMeta,
} from "@/lib/resume/history";
import { RESUME_TEMPLATES } from "@/app/components/resume-templates/registry";
import type { HistoryRecord } from "@/lib/types/resume";

interface HistoryPanelProps {
  records: HistoryRecord[];
  activeId?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRecordsChange: (records: HistoryRecord[]) => void;
  onRestore: (record: HistoryRecord) => void;
  onContinueChat?: (record: HistoryRecord) => void;
}

export default function HistoryPanel({
  records,
  activeId,
  searchQuery,
  onSearchChange,
  onRecordsChange,
  onRestore,
  onContinueChat,
}: HistoryPanelProps) {
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    void deleteHistoryRecord(id).then(onRecordsChange);
  }

  function confirmClear() {
    void clearHistory().then(() => {
      onRecordsChange([]);
      setClearConfirmOpen(false);
    });
  }

  async function saveTitle(id: string) {
    const title = editingTitle.trim();
    if (!title) return;
    const updated = await updateHistoryMeta(id, { title });
    onRecordsChange(updated);
    setEditingId(null);
  }

  return (
    <>
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">历史记录</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              最近 {records.length} 条，支持搜索与重命名
            </p>
          </div>
          {records.length > 0 && (
            <button
              type="button"
              onClick={() => setClearConfirmOpen(true)}
              className="text-xs text-zinc-500 hover:text-red-600"
            >
              清空全部
            </button>
          )}
        </div>

        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索标题、摘要、JD..."
          className="mb-4 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
        />

        {records.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            {searchQuery ? "没有匹配的记录" : "暂无历史记录，完成一次优化后将自动保存"}
          </p>
        ) : (
          <ul className="space-y-2">
            {records.map((record) => (
              <li key={record.id}>
                <div
                  className={`rounded-lg border p-3 transition ${
                    activeId === record.id
                      ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                      : "border-zinc-100 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onRestore(record)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {record.title || `评分 ${record.score}`}
                        </span>
                        {record.jdMatchRate != null && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            JD {record.jdMatchRate}%
                          </span>
                        )}
                        {record.projectTitle && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {record.projectTitle}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {record.resumePreview}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                        {record.summary}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-xs text-zinc-400">
                        {formatHistoryTime(record.createdAt)}
                      </span>
                      <div className="flex gap-2">
                        {onContinueChat && (
                          <button
                            type="button"
                            onClick={() => onContinueChat(record)}
                            className="text-xs text-emerald-600 hover:underline"
                          >
                            就此记录提问
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(record.id);
                            setEditingTitle(record.title || record.resumePreview);
                          }}
                          className="text-xs text-zinc-400 hover:text-zinc-600"
                        >
                          重命名
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(record.id, e)}
                          className="text-xs text-zinc-400 hover:text-red-600"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                  {editingId === record.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={() => void saveTitle(record.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white"
                      >
                        保存
                      </button>
                    </div>
                  )}
                </div>
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
