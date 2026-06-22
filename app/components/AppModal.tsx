"use client";

import { useEffect } from "react";

export interface AppModalProps {
  open: boolean;
  title: string;
  message: string;
  type?: "confirm" | "alert";
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm?: () => void;
  onCancel?: () => void;
}

// 全局模态框组件，用于显示确认、警告等消息
export default function AppModal({
  open,
  title,
  message,
  type = "alert",
  confirmLabel = "确定",
  cancelLabel = "取消",
  variant = "default",
  onConfirm,
  onCancel,
}: AppModalProps) {
  // 处理键盘事件
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  // 渲染模态框
  if (!open) return null;

  // 确定按钮样式
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4"
      onClick={() => onCancel?.()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="app-modal-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          {type === "confirm" && (
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirm?.()}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
