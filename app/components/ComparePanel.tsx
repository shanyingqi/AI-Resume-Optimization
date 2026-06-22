"use client";

import { useRef, useState } from "react";
import AppModal from "./AppModal";
import DownloadButton from "./DownloadButton";

interface ComparePanelProps {
  original: string;
  optimized: string;
  onApplyOptimized?: (optimized: string) => void;
}

// 左右对照查看原文与 AI 优化后的完整简历，滚动已同步
export default function ComparePanel({
  original,
  optimized,
  onApplyOptimized,
}: ComparePanelProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const [applied, setApplied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 同步左右面板滚动
  function syncScroll(source: "left" | "right") {
    if (syncing.current) return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    syncing.current = true;
    if (source === "left") {
      right.scrollTop = left.scrollTop;
    } else {
      left.scrollTop = right.scrollTop;
    }
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }

  // 确认应用优化版
  function handleConfirmApply() {
    onApplyOptimized?.(optimized);
    setConfirmOpen(false);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          左右对照查看原文与 AI 优化后的完整简历，滚动已同步
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {onApplyOptimized && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
            >
              {applied ? "已应用到简历" : "应用优化版"}
            </button>
          )}
          <DownloadButton
            content={optimized}
            filenamePrefix="优化版简历"
            label="下载优化版"
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="border-b border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-800">
            原文
          </div>
          <div
            ref={leftRef}
            onScroll={() => syncScroll("left")}
            className="flex-1 overflow-x-hidden overflow-y-auto p-4 text-sm leading-relaxed break-words whitespace-pre-wrap text-zinc-700 dark:text-zinc-300"
          >
            {original}
          </div>
        </div>

        <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-900">
          <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            优化版
          </div>
          <div
            ref={rightRef}
            onScroll={() => syncScroll("right")}
            className="flex-1 overflow-x-hidden overflow-y-auto p-4 text-sm leading-relaxed break-words whitespace-pre-wrap text-emerald-800 dark:text-emerald-300"
          >
            {optimized}
          </div>
        </div>
      </div>

      <AppModal
        open={confirmOpen}
        title="应用优化版"
        message="将用优化版替换左侧简历内容，当前编辑内容将被覆盖，是否继续？"
        type="confirm"
        confirmLabel="确认应用"
        cancelLabel="取消"
        onConfirm={handleConfirmApply}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
