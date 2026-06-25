"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { ACCEPTED_RESUME_EXTENSIONS } from "@/lib/resume/constants";
import { parseResumeFile, resumeTitleFromFileName } from "@/lib/resume/parse-client";
import { saveResumeProfile } from "@/lib/resume/profile";

// 欢迎使用小单 AI
export default function OnboardingModal() {
  const { user, profileReady, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [content, setContent] = useState("");
  const [importedFileName, setImportedFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!profileReady || !user || user.onboardingCompleted) {
    return null;
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setError("");
    try {
      const { text, fileName } = await parseResumeFile(file);
      setContent(text);
      setImportedFileName(fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  // 完成设置
  async function finish(skipResume = false) {
    setSaving(true);
    setError("");
    try {
      if (!skipResume && content.trim()) {
        await saveResumeProfile({
          content: content.trim(),
          title: importedFileName
            ? resumeTitleFromFileName(importedFileName)
            : undefined,
        });
      }
      await updateProfile({ onboardingCompleted: true });
    } catch {
      setError("保存失败，请重试");
      setSaving(false);
    }
  }

  const accept = ACCEPTED_RESUME_EXTENSIONS.join(",");

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        {step === 0 ? (
          <>
            <h2 className="text-xl font-semibold">欢迎使用小单 AI</h2>
            <p className="mt-2 text-sm text-zinc-500">
              登录后，你的简历优化记录、求职项目和 AI 对话都会云端同步。
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <li>· 设置主简历，避免每次重复粘贴</li>
              <li>· 按岗位管理求职项目</li>
              <li>· 优化结果可继续 AI 对话追问</li>
            </ul>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-6 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              开始设置
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold">设置主简历</h2>
            <p className="mt-2 text-sm text-zinc-500">
              导入或粘贴你的简历，之后进入「简历优化」会自动载入。
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              disabled={importing || saving}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleImportFile(file);
              }}
            />
            <button
              type="button"
              disabled={importing || saving}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-3 text-sm text-zinc-600 transition hover:border-emerald-400 hover:bg-emerald-50/50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {importing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                  正在解析简历...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  导入简历（PDF / DOCX / TXT / MD）
                </>
              )}
            </button>
            {importedFileName && (
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                已导入：{importedFileName}
              </p>
            )}
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (importedFileName) setImportedFileName("");
              }}
              rows={10}
              placeholder="或在此粘贴简历正文..."
              className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-900"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={saving || importing}
                onClick={() => void finish(true)}
                className="flex-1 rounded-2xl border border-zinc-200 py-3 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                稍后再说
              </button>
              <button
                type="button"
                disabled={saving || importing || !content.trim()}
                onClick={() => void finish(false)}
                className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "保存中..." : "保存并继续"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
