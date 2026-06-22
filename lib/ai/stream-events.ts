import type { OptimizeResult } from "@/lib/types/resume";

export type OptimizeStreamEvent =
  | { type: "step"; step: number; total: number; message: string }
  | { type: "progress"; chars: number }
  | { type: "result"; data: OptimizeResult }
  | { type: "error"; message: string };

export const OPTIMIZE_STEP_LABELS = [
  "校验简历内容",
  "构建分析方案",
  "AI 分析简历",
  "整理分析结果",
] as const;

export const OPTIMIZE_STEP_TOTAL = OPTIMIZE_STEP_LABELS.length;

export interface OptimizeLoadingState {
  step: number;
  total: number;
  message: string;
  streamChars: number;
}

export const INITIAL_LOADING_STATE: OptimizeLoadingState = {
  step: 0,
  total: OPTIMIZE_STEP_TOTAL,
  message: "准备中...",
  streamChars: 0,
};
