"use client";

import { useRef } from "react";
import DownloadButton from "./DownloadButton";

interface ComparePanelProps {
  original: string;
  optimized: string;
}

// 左右对照查看原文与 AI 优化后的完整简历，滚动已同步
export default function ComparePanel({ original, optimized }: ComparePanelProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  /** 左右面板滚动联动，便于逐段对比 */
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          左右对照查看原文与 AI 优化后的完整简历，滚动已同步
        </p>
        <DownloadButton
          content={optimized}
          filenamePrefix="优化版简历"
          label="下载优化版"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="border-b border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-800">
            原文
          </div>
          <div
            ref={leftRef}
            onScroll={() => syncScroll("left")}
            className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300"
          >
            {original}
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-900">
          <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            优化版
          </div>
          <div
            ref={rightRef}
            onScroll={() => syncScroll("right")}
            className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed whitespace-pre-wrap text-emerald-800 dark:text-emerald-300"
          >
            {optimized}
          </div>
        </div>
      </div>
    </div>
  );
}
