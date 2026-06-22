"use client";

import { useEffect, useState } from "react";
import HistoryPanel from "./HistoryPanel";
import OptimizeResultPanel from "./OptimizeResultPanel";
import ResumeUploader from "./ResumeUploader";
import { DRAFT_STORAGE_KEY } from "@/lib/resume/constants";
import { loadHistory, saveHistoryRecord } from "@/lib/resume/history";
import type { HistoryRecord, OptimizeMode, OptimizeResult } from "@/lib/types/resume";

const SAMPLE_RESUME = `张三 | 前端开发工程师 | zhangsan@email.com

工作经历
2022.06 - 至今  XX科技  前端工程师
- 负责公司后台管理系统开发
- 使用 React 和 TypeScript 完成多个业务模块
- 参与代码评审和技术分享

项目经历
电商管理后台
- 参与订单、商品模块开发
- 使用 Ant Design 搭建 UI

技能：JavaScript, React, Vue, CSS`;

type InputTab = "upload" | "paste";

interface DraftData {
  resume: string;
  jobDescription: string;
  mode: OptimizeMode;
  inputTab: InputTab;
}

export default function ResumeOptimizer() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState<OptimizeMode>("general");
  const [inputTab, setInputTab] = useState<InputTab>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<
    (OptimizeResult & { mock?: boolean }) | null
  >(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string>();

  useEffect(() => {
    setHistoryRecords(loadHistory());

    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftData;
      if (draft.resume) setResume(draft.resume);
      if (draft.jobDescription) setJobDescription(draft.jobDescription);
      if (draft.mode) setMode(draft.mode);
      if (draft.inputTab) setInputTab(draft.inputTab);
      setDraftRestored(true);
    } catch {
      // ignore invalid draft
    }
  }, []);

  useEffect(() => {
    const draft: DraftData = { resume, jobDescription, mode, inputTab };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [resume, jobDescription, mode, inputTab]);

  function handleClear() {
    setResume("");
    setJobDescription("");
    setResult(null);
    setError("");
    setActiveHistoryId(undefined);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftRestored(false);
  }

  function handleRestoreHistory(record: HistoryRecord) {
    setResume(record.resume);
    setJobDescription(record.jobDescription ?? "");
    setMode(record.mode);
    setResult(record.result);
    setActiveHistoryId(record.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setActiveHistoryId(undefined);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "请求失败");
      }

      setResult(data);

      const record = saveHistoryRecord({
        mode,
        resume,
        jobDescription: jobDescription || undefined,
        result: data,
      });
      setHistoryRecords(loadHistory());
      setActiveHistoryId(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  const charCount = resume.length;
  const wordHint =
    charCount === 0
      ? ""
      : charCount < 200
        ? "内容偏短，建议补充更多经历细节"
        : charCount > 8000
          ? "内容较长，分析可能更慢"
          : "长度适中";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          小单 AI 简历优化
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          让简历更专业、更匹配岗位
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          上传或粘贴简历，AI 给出评分、JD 匹配度、问题诊断，并支持原文与优化版左右对比。
        </p>
      </header>

      {draftRestored && (
        <p className="rounded-lg bg-blue-50 px-4 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          已恢复上次未完成的草稿
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setInputTab("upload")}
              className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
                inputTab === "upload"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              上传简历
            </button>
            <button
              type="button"
              onClick={() => setInputTab("paste")}
              className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
                inputTab === "paste"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              粘贴文本
            </button>
          </div>

          {inputTab === "upload" ? (
            <ResumeUploader
              disabled={loading}
              onParsed={(text) => {
                setResume(text);
                setResult(null);
                setError("");
                setActiveHistoryId(undefined);
              }}
            />
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setResume(SAMPLE_RESUME)}
                className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
              >
                填入示例
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label htmlFor="resume" className="text-sm font-medium">
              简历内容
            </label>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              {charCount > 0 && <span>{charCount} 字</span>}
              {wordHint && <span>{wordHint}</span>}
            </div>
          </div>
          <textarea
            id="resume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder={
              inputTab === "upload"
                ? "上传文件后内容将显示在这里，也可手动编辑..."
                : "粘贴你的简历文本..."
            }
            rows={14}
            required
            className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />

          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="mode"
                checked={mode === "general"}
                onChange={() => setMode("general")}
                className="accent-emerald-600"
              />
              通用优化
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="mode"
                checked={mode === "targeted"}
                onChange={() => setMode("targeted")}
                className="accent-emerald-600"
              />
              针对 JD 定向优化
            </label>
          </div>

          {mode === "targeted" && (
            <>
              <label htmlFor="jd" className="text-sm font-medium">
                目标岗位 JD
              </label>
              <textarea
                id="jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="粘贴招聘岗位描述..."
                rows={6}
                required={mode === "targeted"}
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !resume.trim()}
              className="flex-1 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "分析中..." : "开始优化"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              清空
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <OptimizeResultPanel
          result={result}
          loading={loading}
          originalResume={resume}
          isTargeted={mode === "targeted"}
        />
      </form>

      <HistoryPanel
        records={historyRecords}
        activeId={activeHistoryId}
        onRecordsChange={setHistoryRecords}
        onRestore={handleRestoreHistory}
      />
    </div>
  );
}
