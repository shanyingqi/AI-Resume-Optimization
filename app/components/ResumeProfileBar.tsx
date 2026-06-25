"use client";

import { useEffect, useRef, useState } from "react";
import { ACCEPTED_RESUME_EXTENSIONS } from "@/lib/resume/constants";
import { parseResumeFile, resumeTitleFromFileName } from "@/lib/resume/parse-client";
import { fetchResumeProfile, saveResumeProfile } from "@/lib/resume/profile";
import type { ResumeProfile } from "@/lib/types/project";

interface ResumeProfileBarProps {
  onLoad: (content: string) => void;
  currentContent: string;
}

// 简历配置栏
export default function ResumeProfileBar({
  onLoad,
  currentContent,
}: ResumeProfileBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewOpen, setViewOpen] = useState(false);

  useEffect(() => {
    void fetchResumeProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }

  // 保存主简历
  async function handleSaveMaster() {
    if (!currentContent.trim()) return;
    setSaving(true);
    setNotice("");
    try {
      const saved = await saveResumeProfile({ content: currentContent });
      setProfile(saved);
      showNotice("已保存为主简历");
    } catch {
      showNotice("保存失败");
    } finally {
      setSaving(false);
    }
  }

  // 载入主简历
  function handleLoadMaster() {
    if (!profile?.content) return;
    onLoad(profile.content);
    showNotice("已载入主简历");
  }

  // 导入文件并设为主简历
  async function handleImportFile(file: File) {
    setImporting(true);
    setNotice("");
    try {
      const { text, fileName } = await parseResumeFile(file);
      const saved = await saveResumeProfile({
        title: resumeTitleFromFileName(fileName),
        content: text,
      });
      setProfile(saved);
      onLoad(text);
      showNotice(`已导入并设为主简历：${fileName}`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  if (loading) return null;

  const accept = ACCEPTED_RESUME_EXTENSIONS.join(",");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="min-w-0">
          {profile ? (
            <button
              type="button"
              onClick={() => setViewOpen(true)}
              className="text-left font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
            >
              主简历：{profile.title}
            </button>
          ) : (
            <p className="font-medium text-emerald-800 dark:text-emerald-300">
              主简历未设置
            </p>
          )}
          <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
            {profile
              ? `最近更新 ${new Date(profile.updatedAt).toLocaleDateString("zh-CN")} · 点击查看`
              : "可导入文件或保存当前内容为主简历"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-300"
          >
            {importing ? "导入中..." : "导入设为主简历"}
          </button>
          {profile && (
            <button
              type="button"
              onClick={handleLoadMaster}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-300"
            >
              载入主简历
            </button>
          )}
          <button
            type="button"
            disabled={saving || importing || !currentContent.trim()}
            onClick={() => void handleSaveMaster()}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "保存中..." : "保存当前为主简历"}
          </button>
        </div>
        {notice && <span className="w-full text-xs text-emerald-700">{notice}</span>}
      </div>

      {viewOpen && profile && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setViewOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold">{profile.title}</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  更新于 {new Date(profile.updatedAt).toLocaleString("zh-CN")} ·{" "}
                  {profile.content.length.toLocaleString()} 字
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {profile.content}
              </pre>
            </div>
            <div className="flex justify-end gap-3 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLoadMaster();
                  setViewOpen(false);
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                载入到编辑区
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
