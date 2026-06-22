"use client";

import {
  OPTIMIZE_STEP_LABELS,
  type OptimizeLoadingState,
} from "@/lib/ai/stream-events";

interface OptimizeLoadingPanelProps {
  state: OptimizeLoadingState;
  onCancel?: () => void;
}

export default function OptimizeLoadingPanel({
  state,
  onCancel,
}: OptimizeLoadingPanelProps) {
  const progressPercent =
    state.step > 0 ? Math.round((state.step / state.total) * 100) : 0;

  return (
    <div className="flex h-full min-h-[320px] flex-col justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {state.message}
            </p>
            {state.streamChars > 0 && (
              <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                AI 已生成 {state.streamChars.toLocaleString()} 字
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>
              步骤 {state.step}/{state.total}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ul className="space-y-2">
          {OPTIMIZE_STEP_LABELS.map((label, index) => {
            const stepNum = index + 1;
            const isDone = state.step > stepNum;
            const isCurrent = state.step === stepNum;

            return (
              <li
                key={label}
                className={`flex items-center gap-2 text-sm ${
                  isDone
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isCurrent
                      ? "font-medium text-zinc-800 dark:text-zinc-200"
                      : "text-zinc-400"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    isDone
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : isCurrent
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"
                  }`}
                >
                  {isDone ? "✓" : stepNum}
                </span>
                {label}
              </li>
            );
          })}
        </ul>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            取消分析
          </button>
        )}
      </div>
    </div>
  );
}
