import { apiFetch } from "@/lib/api/client";
import type { OptimizeMode } from "@/lib/types/resume";

export type InputTab = "upload" | "paste";

export interface OptimizeDraftData {
  resume: string;
  jobDescription: string;
  mode: OptimizeMode;
  inputTab: InputTab;
  cleared?: boolean;
  updatedAt?: string;
}

/** 从服务端加载账号草稿 */
export async function fetchOptimizeDraft(): Promise<OptimizeDraftData | null> {
  const data = await apiFetch<{ draft: OptimizeDraftData | null }>(
    "/api/optimize-draft",
  );
  return data.draft;
}

/** 保存账号草稿到服务端 */
export async function saveOptimizeDraft(
  draft: OptimizeDraftData,
): Promise<void> {
  await apiFetch("/api/optimize-draft", {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

/** 清空账号草稿 */
export async function clearOptimizeDraft(): Promise<void> {
  await apiFetch("/api/optimize-draft", { method: "DELETE" });
}
