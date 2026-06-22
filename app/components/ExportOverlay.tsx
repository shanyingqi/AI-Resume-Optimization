"use client";

import { createPortal } from "react-dom";

interface ExportOverlayProps {
  message: string;
}

// 导出覆盖层，用于显示导出进度
export default function ExportOverlay({ message }: ExportOverlayProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/65 backdrop-blur-[2px]">
      <div className="mx-4 flex flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-2xl dark:bg-zinc-900">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-emerald-600 border-t-transparent" />
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{message}</p>
      </div>
    </div>,
    document.body,
  );
}
