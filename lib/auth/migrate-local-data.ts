import { apiFetch } from "@/lib/api/client";
import {
  CHAT_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
} from "@/lib/resume/constants";
import type { ChatSession } from "@/lib/types/chat";
import type { HistoryRecord } from "@/lib/types/resume";

const MIGRATION_KEY = "xiaodan-data-migrated";

/** 登录后将 localStorage 中的历史与聊天迁移到服务端（仅执行一次） */
export async function migrateLocalDataToServer(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_KEY) === "true") return;

  try {
    const historyRaw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (historyRaw) {
      const records = JSON.parse(historyRaw) as HistoryRecord[];
      if (Array.isArray(records)) {
        for (const record of records.slice(0, 20).reverse()) {
          try {
            const { record: created } = await apiFetch<{
              record: HistoryRecord;
            }>("/api/history", {
              method: "POST",
              body: JSON.stringify({
                mode: record.mode,
                resume: record.resume,
                jobDescription: record.jobDescription,
                result: record.result,
              }),
            });
            if (record.coverLetter || record.resumeTemplateId) {
              await apiFetch(`/api/history/${created.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  coverLetter: record.coverLetter,
                  resumeTemplateId: record.resumeTemplateId,
                }),
              });
            }
          } catch {
            // 单条迁移失败时跳过
          }
        }
      }
    }

    const chatRaw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (chatRaw) {
      const sessions = JSON.parse(chatRaw) as ChatSession[];
      if (Array.isArray(sessions)) {
        for (const session of sessions.filter((s) => s.messages.length > 0)) {
          try {
            await apiFetch("/api/chat/sessions", {
              method: "POST",
              body: JSON.stringify({ session }),
            });
          } catch {
            // 单条迁移失败时跳过
          }
        }
      }
    }

    localStorage.removeItem(HISTORY_STORAGE_KEY);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.setItem(MIGRATION_KEY, "true");
  } catch {
    // 迁移失败不阻断登录
  }
}
