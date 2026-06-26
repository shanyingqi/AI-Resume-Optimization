"use client";

import { useMemo, useRef, useState } from "react";
import AppModal from "./AppModal";
import ResumeExportButton from "./ResumeExportButton";
import { MAX_RESUME_CHARS } from "@/lib/resume/constants";
import type { DiffCell } from "@/lib/resume/text-diff";
import { diffResumeLines } from "@/lib/resume/text-diff";
import { resolveStructuredResume } from "@/lib/resume/structured-resume";
import type { ResumeTemplateId, StructuredResume } from "@/lib/types/resume";

type RightView = "compare" | "edit";

interface ComparePanelProps {
  original: string;
  optimized: string;
  structuredResume?: StructuredResume;
  templateId: ResumeTemplateId;
  onOptimizedChange?: (optimized: string) => void;
  onApplyOptimized?: (optimized: string) => void;
}

// 计算单元格样式
function cellClass(cell: DiffCell, side: "left" | "right"): string {
  if (cell.type === "empty") {
    return "min-h-[1.6em] bg-zinc-50/80 dark:bg-zinc-800/30";
  }
  if (cell.type === "delete") {
    return "bg-red-100 text-red-800 line-through decoration-red-400 dark:bg-red-950/50 dark:text-red-300";
  }
  if (cell.type === "insert") {
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  return side === "right"
    ? "text-emerald-800 dark:text-emerald-300"
    : "text-zinc-700 dark:text-zinc-300";
}

// 渲染差异单元格
function DiffCellView({ cell, side }: { cell: DiffCell; side: "left" | "right" }) {
  return (
    <div
      className={`break-words px-4 py-0.5 text-sm leading-relaxed whitespace-pre-wrap ${cellClass(cell, side)}`}
    >
      {cell.type === "empty" ? "\u00a0" : cell.text || "\u00a0"}
    </div>
  );
}

// 左右对比面板
export default function ComparePanel({
  original,
  optimized,
  structuredResume,
  templateId,
  onOptimizedChange,
  onApplyOptimized,
}: ComparePanelProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const [applied, setApplied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rightView, setRightView] = useState<RightView>("compare");

  const rows = useMemo(
    () => diffResumeLines(original, optimized),
    [original, optimized],
  );

  const resumeData = useMemo(
    () => resolveStructuredResume(structuredResume, optimized),
    [structuredResume, optimized],
  );

  const charCount = optimized.length;
  const overLimit = charCount > MAX_RESUME_CHARS;

  // 同步滚动
  function syncScroll(source: "left" | "right") {
    if (syncing.current || rightView !== "compare") return;
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
        <div className="space-y-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {rightView === "compare"
              ? "左右对照查看差异，滚动已同步"
              : "可直接修改优化版全文，预览与导出将使用编辑后的内容"}
          </p>
          {rightView === "compare" && (
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-red-100 dark:bg-red-950/50" />
                删除
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-950/50" />
                新增
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOptimizedChange && (
            <button
              type="button"
              onClick={() =>
                setRightView((v) => (v === "compare" ? "edit" : "compare"))
              }
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                rightView === "edit"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {rightView === "edit" ? "返回对比" : "手动编辑"}
            </button>
          )}
          {onApplyOptimized && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!optimized.trim() || overLimit}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
            >
              {applied ? "已应用到简历" : "应用优化版"}
            </button>
          )}
          <ResumeExportButton
            data={resumeData}
            templateId={templateId}
            filenamePrefix="优化版简历"
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
            className="flex-1 overflow-x-hidden overflow-y-auto py-2"
          >
            {rows.map((row, i) => (
              <DiffCellView key={`l-${i}`} cell={row.left} side="left" />
            ))}
          </div>
        </div>

        <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-900">
          <div className="flex items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 dark:border-emerald-900 dark:bg-emerald-950">
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              优化版
            </span>
            {rightView === "edit" && (
              <span
                className={`text-xs ${overLimit ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}
              >
                {charCount.toLocaleString()} / {MAX_RESUME_CHARS.toLocaleString()} 字
              </span>
            )}
          </div>
          {rightView === "edit" && onOptimizedChange ? (
            <textarea
              value={optimized}
              onChange={(e) => onOptimizedChange(e.target.value)}
              className="min-h-0 flex-1 resize-none border-0 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:bg-zinc-950 dark:text-zinc-100"
              spellCheck={false}
            />
          ) : (
            <div
              ref={rightRef}
              onScroll={() => syncScroll("right")}
              className="flex-1 overflow-x-hidden overflow-y-auto py-2"
            >
              {rows.map((row, i) => (
                <DiffCellView key={`r-${i}`} cell={row.right} side="right" />
              ))}
            </div>
          )}
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
