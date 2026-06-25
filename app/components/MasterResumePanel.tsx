"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ACCEPTED_RESUME_EXTENSIONS, MAX_RESUME_CHARS } from "@/lib/resume/constants";
import { parseResumeFile, resumeTitleFromFileName } from "@/lib/resume/parse-client";
import { fetchResumeProfile, saveResumeProfile } from "@/lib/resume/profile";

// 主简历管理页
export default function MasterResumePanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("我的简历");
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchResumeProfile()
      .then((profile) => {
        if (profile) {
          setContent(profile.content);
          setTitle(profile.title);
          setUpdatedAt(profile.updatedAt);
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }

  async function handleSave() {
    if (!content.trim()) {
      setError("简历内容不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await saveResumeProfile({ title: title.trim() || "我的简历", content });
      setTitle(saved.title);
      setUpdatedAt(saved.updatedAt);
      showNotice("主简历已保存");
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setError("");
    try {
      const { text, fileName } = await parseResumeFile(file);
      const saved = await saveResumeProfile({
        title: resumeTitleFromFileName(fileName),
        content: text,
      });
      setContent(saved.content);
      setTitle(saved.title);
      setUpdatedAt(saved.updatedAt);
      showNotice(`已导入：${fileName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  const charCount = content.length;
  const overLimit = charCount > MAX_RESUME_CHARS;
  const accept = ACCEPTED_RESUME_EXTENSIONS.join(",");

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        加载中...
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 overflow-y-auto px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">主简历</h1>
        <p className="text-sm text-zinc-500">
          保存一份通用主简历，求职项目、简历优化和 AI 对话会自动引用
        </p>
        {updatedAt && (
          <p className="text-xs text-zinc-400">
            最近更新 {new Date(updatedAt).toLocaleString("zh-CN")}
          </p>
        )}
      </header>

      {notice && (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="resume-title" className="text-sm font-medium">
            简历标题
          </label>
          <input
            id="resume-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：张三 · 前端开发"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="resume-content" className="text-sm font-medium">
              简历内容
            </label>
            <span className={`text-xs ${overLimit ? "text-red-600" : "text-zinc-500"}`}>
              {charCount.toLocaleString()} / {MAX_RESUME_CHARS.toLocaleString()} 字
            </span>
          </div>
          <textarea
            id="resume-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            placeholder="粘贴或编辑你的简历全文..."
            className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={importing || saving}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleImport(file);
            }}
          />
          <button
            type="button"
            disabled={importing || saving}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {importing ? "导入中..." : "导入文件"}
          </button>
          <button
            type="button"
            disabled={saving || importing || !content.trim() || overLimit}
            onClick={() => void handleSave()}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "保存中..." : "保存主简历"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/resume")}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            去优化简历
          </button>
        </div>
      </div>
    </div>
  );
}
