"use client";

import { useEffect, useRef, useState } from "react";
import HistoryPanel from "./HistoryPanel";
import OptimizeResultPanel from "./OptimizeResultPanel";
import ResumeUploader from "./ResumeUploader";
import { DRAFT_STORAGE_KEY, MAX_JD_CHARS, MAX_RESUME_CHARS } from "@/lib/resume/constants";
import { loadHistory, saveHistoryRecord } from "@/lib/resume/history";
import {
  consumeOptimizeStream,
  INITIAL_LOADING_STATE,
  type OptimizeLoadingState,
} from "@/lib/resume/optimize-stream";
import { validateOptimizeInput } from "@/lib/resume/validate";
import type { HistoryRecord, OptimizeMode, OptimizeResult } from "@/lib/types/resume";

type InputTab = "upload" | "paste";

/** 自动保存到 localStorage 的草稿结构 */
interface DraftData {
  resume: string;
  jobDescription: string;
  mode: OptimizeMode;
  inputTab: InputTab;
}

/**
 * 简历优化主页面：输入简历 → 调用 API → 展示分析结果，并管理草稿与历史。
 */
export default function ResumeOptimizer() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState<OptimizeMode>("general");
  const [inputTab, setInputTab] = useState<InputTab>("upload");
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<OptimizeLoadingState>(
    INITIAL_LOADING_STATE,
  );
  const [error, setError] = useState("");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string>();
  const [applyNotice, setApplyNotice] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // 初始化：加载历史记录，并尝试恢复未提交的草稿
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // 草稿数据损坏时忽略
    }
  }, []);

  // 编辑内容变化时自动保存草稿
  useEffect(() => {
    const draft: DraftData = { resume, jobDescription, mode, inputTab };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [resume, jobDescription, mode, inputTab]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // 清空所有输入内容
  function handleClear() {
    setResume("");
    setJobDescription("");
    setResult(null);
    setError("");
    setActiveHistoryId(undefined);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftRestored(false);
  }

  // 恢复历史记录
  function handleRestoreHistory(record: HistoryRecord) {
    setResume(record.resume);
    setJobDescription(record.jobDescription ?? "");
    setMode(record.mode);
    setResult(record.result);
    setActiveHistoryId(record.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 将优化版简历应用到左侧编辑区
  function handleApplyOptimized(optimized: string) {
    setResume(optimized);
    setResult(null);
    setError("");
    setActiveHistoryId(undefined);
    setApplyNotice("已将优化版应用到简历内容，可继续编辑或再次优化");
    setTimeout(() => setApplyNotice(""), 4000);
    document.getElementById("resume")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // 取消正在进行的分析
  function handleCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setLoadingState(INITIAL_LOADING_STATE);
  }

  // 提交优化请求（SSE 流式）
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateOptimizeInput(resume, jobDescription, mode);
    if (validationError) {
      setError(validationError);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadingState(INITIAL_LOADING_STATE);
    setError("");
    setResult(null);
    setActiveHistoryId(undefined);
    setApplyNotice("");

    try {
      const data = await consumeOptimizeStream(
        { resume, jobDescription, mode },
        setLoadingState,
        controller.signal,
      );

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
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  const charCount = resume.length;
  const jdCount = jobDescription.length;
  const resumeOverLimit = charCount > MAX_RESUME_CHARS;
  const jdOverLimit = mode === "targeted" && jdCount > MAX_JD_CHARS;
  const wordHint =
    charCount === 0
      ? ""
      : resumeOverLimit
        ? `超出上限 ${MAX_RESUME_CHARS.toLocaleString()} 字`
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

      {applyNotice && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {applyNotice}
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
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

          {inputTab === "upload" && (
            <ResumeUploader
              disabled={loading}
              onParsed={(text) => {
                setResume(text);
                setResult(null);
                setError("");
                setActiveHistoryId(undefined);
              }}
            />
          )}

          <div className="flex items-center justify-between">
            <label htmlFor="resume" className="text-sm font-medium">
              简历内容
            </label>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              {charCount > 0 && (
                <span className={resumeOverLimit ? "text-red-600" : ""}>
                  {charCount.toLocaleString()} / {MAX_RESUME_CHARS.toLocaleString()} 字
                </span>
              )}
              {wordHint && (
                <span className={resumeOverLimit ? "text-red-600" : ""}>{wordHint}</span>
              )}
            </div>
          </div>
          <textarea
            id="resume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            maxLength={MAX_RESUME_CHARS + 500}
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
              <div className="flex items-center justify-between">
                <label htmlFor="jd" className="text-sm font-medium">
                  目标岗位 JD
                </label>
                {jdCount > 0 && (
                  <span
                    className={`text-xs ${jdOverLimit ? "text-red-600" : "text-zinc-500"}`}
                  >
                    {jdCount.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()} 字
                  </span>
                )}
              </div>
              <textarea
                id="jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                maxLength={MAX_JD_CHARS + 200}
                placeholder="粘贴招聘岗位描述..."
                rows={6}
                required={mode === "targeted"}
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </>
          )}

          <div className="flex gap-3">
            {loading ? (
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              >
                取消分析
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  !resume.trim() || resumeOverLimit || jdOverLimit
                }
                className="flex-1 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                开始优化
              </button>
            )}
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
          loadingState={loadingState}
          originalResume={resume}
          isTargeted={mode === "targeted"}
          onApplyOptimized={handleApplyOptimized}
          onCancel={handleCancel}
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
