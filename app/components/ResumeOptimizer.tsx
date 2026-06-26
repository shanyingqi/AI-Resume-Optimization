"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HistoryPanel from "./HistoryPanel";
import OptimizeResultPanel from "./OptimizeResultPanel";
import ResumeProfileBar from "./ResumeProfileBar";
import ResumeUploader from "./ResumeUploader";
import { fetchProjects, fetchProject } from "@/lib/projects/applications";
import {
  buildChatContextFromHistory,
  defaultAutoMessageFromResult,
  type DraftChatPayload,
  projectOptionLabel,
} from "@/lib/resume/chat-context";
import { stashDraftChatPayload } from "@/lib/resume/draft-chat";
import { DRAFT_OPTIMIZE_KEY } from "@/lib/resume/constants";
import type { JobApplicationSummary } from "@/lib/types/project";
import { DRAFT_STORAGE_KEY, MAX_JD_CHARS, MAX_RESUME_CHARS } from "@/lib/resume/constants";
import {
  fetchOptimizeDraft,
  saveOptimizeDraft,
} from "@/lib/resume/draft";
import {
  fetchHistory,
  saveHistoryRecord,
  updateHistoryCoverLetter,
  updateHistoryTemplate,
} from "@/lib/resume/history";
import { fetchResumeProfile } from "@/lib/resume/profile";
import {
  consumeOptimizeStream,
  INITIAL_LOADING_STATE,
  type OptimizeLoadingState,
} from "@/lib/resume/optimize-stream";
import { validateOptimizeInput } from "@/lib/resume/validate";
import type { CoverLetterResult, HistoryRecord, OptimizeMode, OptimizeResult, ResumeTemplateId } from "@/lib/types/resume";

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
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [resumeTemplateId, setResumeTemplateId] = useState<ResumeTemplateId>("classic");
  const [applyNotice, setApplyNotice] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [projects, setProjects] = useState<JobApplicationSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const profileLoadedRef = useRef(false);
  const draftReadyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedProjectNavRef = useRef<string | null>(null);

  const refreshHistory = (q?: string) => {
    void fetchHistory({ q: q?.trim() || undefined })
      .then(setHistoryRecords)
      .catch(() => setHistoryRecords([]));
  };

  // 初始化：加载历史、账号草稿、主简历；支持从 URL 恢复某条记录
  useEffect(() => {
    refreshHistory();

    void (async () => {
      let restoredFromDraft = false;
      const projectIdParam = searchParams.get("projectId");

      if (projectIdParam && appliedProjectNavRef.current !== projectIdParam) {
        appliedProjectNavRef.current = projectIdParam;
        setSelectedProjectId(projectIdParam);
        setMode("targeted");
        profileLoadedRef.current = true;
        restoredFromDraft = true;
        try {
          const project = await fetchProject(projectIdParam);
          if (project.jobDescription?.trim()) {
            setJobDescription(project.jobDescription);
            setError("");
          } else {
            setError("该求职项目尚未填写 JD，请先在「求职项目」中补充");
          }
        } catch {
          setError("载入求职项目失败");
        }
      }

      try {
        const optimizeDraft = sessionStorage.getItem(DRAFT_OPTIMIZE_KEY);
        if (optimizeDraft) {
          const parsed = JSON.parse(optimizeDraft) as {
            resume?: string;
            jobDescription?: string;
            mode?: OptimizeMode;
            projectId?: string;
          };
          sessionStorage.removeItem(DRAFT_OPTIMIZE_KEY);
          if (parsed.resume) setResume(parsed.resume);
          if (parsed.jobDescription) setJobDescription(parsed.jobDescription);
          // 兼容旧版 sessionStorage：仍带 projectId 时强制定向优化
          if (!projectIdParam && parsed.projectId) {
            setSelectedProjectId(parsed.projectId);
            setMode("targeted");
            profileLoadedRef.current = true;
            restoredFromDraft = true;
          } else if (!projectIdParam && parsed.mode) {
            setMode(parsed.mode);
          }
          if (!profileLoadedRef.current) profileLoadedRef.current = true;
          if (!restoredFromDraft) restoredFromDraft = Boolean(parsed.resume || parsed.jobDescription);
        }
      } catch {
        // ignore
      }

      const historyId = searchParams.get("historyId");
      if (historyId) {
        void fetchHistory()
          .then((records) => {
            const record = records.find((r) => r.id === historyId);
            if (record) handleRestoreHistory(record);
          })
          .catch(() => undefined);
        profileLoadedRef.current = true;
        draftReadyRef.current = true;
        return;
      }

      if (!restoredFromDraft) {
        try {
          const draft = await fetchOptimizeDraft();
          if (draft !== null) {
            setResume(draft.resume ?? "");
            setJobDescription(draft.jobDescription ?? "");
            if (draft.mode) setMode(draft.mode);
            if (draft.inputTab) setInputTab(draft.inputTab);
            if (draft.resume?.trim() || draft.jobDescription?.trim()) {
              setDraftRestored(true);
            }
            profileLoadedRef.current = true;
            restoredFromDraft = true;
          } else {
            const legacyRaw = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (legacyRaw) {
              const legacy = JSON.parse(legacyRaw) as DraftData;
              localStorage.removeItem(DRAFT_STORAGE_KEY);
              if (legacy.resume || legacy.jobDescription) {
                if (legacy.resume) setResume(legacy.resume);
                if (legacy.jobDescription) setJobDescription(legacy.jobDescription);
                if (legacy.mode) setMode(legacy.mode);
                if (legacy.inputTab) setInputTab(legacy.inputTab);
                setDraftRestored(true);
                profileLoadedRef.current = true;
                restoredFromDraft = true;
                void saveOptimizeDraft({
                  resume: legacy.resume ?? "",
                  jobDescription: legacy.jobDescription ?? "",
                  mode: legacy.mode ?? "general",
                  inputTab: legacy.inputTab ?? "upload",
                }).catch(() => undefined);
              }
            }
          }
        } catch {
          // ignore
        }
      }

      if (!profileLoadedRef.current) {
        void fetchResumeProfile()
          .then((profile) => {
            if (profile?.content && !resume) {
              setResume(profile.content);
            }
          })
          .catch(() => undefined);
      }

      draftReadyRef.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => refreshHistory(historySearch), historySearch ? 300 : 0);
    return () => clearTimeout(timer);
  }, [historySearch]);

  useEffect(() => {
    void fetchProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  // 编辑内容变化时自动保存草稿到账号
  useEffect(() => {
    if (!draftReadyRef.current) return;
    if (!resume.trim() && !jobDescription.trim()) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const draft: DraftData = { resume, jobDescription, mode, inputTab };
      void saveOptimizeDraft(draft).catch(() => undefined);
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [resume, jobDescription, mode, inputTab]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // 清空所有输入内容
  async function handleClear() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setResume("");
    setJobDescription("");
    setMode("general");
    setSelectedProjectId("");
    setResult(null);
    setError("");
    setActiveHistoryId(undefined);
    setResumeTemplateId("classic");
    setDraftRestored(false);

    try {
      await saveOptimizeDraft({
        resume: "",
        jobDescription: "",
        mode: "general",
        inputTab,
      });
    } catch {
      // ignore
    }
  }

  // 恢复历史记录
  function handleRestoreHistory(record: HistoryRecord) {
    setResume(record.resume);
    setJobDescription(record.jobDescription ?? "");
    setResult(record.result);
    setActiveHistoryId(record.id);
    setResumeTemplateId(record.resumeTemplateId ?? "classic");
    if (record.mode === "targeted" && record.projectId) {
      setSelectedProjectId(record.projectId);
      setMode("targeted");
      setJobDescription(record.jobDescription ?? "");
    } else {
      setSelectedProjectId("");
      setMode("general");
      if (record.mode === "targeted") {
        setJobDescription(record.jobDescription ?? "");
      } else {
        setJobDescription("");
      }
    }
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

    const validationError = validateOptimizeInput(
      resume,
      jobDescription,
      mode,
      selectedProjectId || undefined,
    );
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
    setResumeTemplateId("classic");
    setApplyNotice("");

    try {
      const data = await consumeOptimizeStream(
        {
          resume,
          jobDescription,
          mode,
          projectId: selectedProjectId || undefined,
        },
        setLoadingState,
        controller.signal,
      );

      setResult(data);

      const record = await saveHistoryRecord({
        mode,
        resume,
        jobDescription: jobDescription || undefined,
        result: data,
        projectId: selectedProjectId || undefined,
      });
      setHistoryRecords(await fetchHistory({ q: historySearch.trim() || undefined }));
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
  const activeRecord = historyRecords.find((r) => r.id === activeHistoryId);
  const savedCoverLetter = activeRecord?.coverLetter;

  // 保存求职信到历史记录
  function handleCoverLetterSaved(coverLetter: CoverLetterResult) {
    if (!activeHistoryId) return;
    void updateHistoryCoverLetter(activeHistoryId, coverLetter).then(setHistoryRecords);
  }

  // 切换简历模板
  function handleTemplateChange(templateId: ResumeTemplateId) {
    setResumeTemplateId(templateId);
    if (activeHistoryId) {
      void updateHistoryTemplate(activeHistoryId, templateId).then(setHistoryRecords);
    }
  }

  function openChatWithContext(payload: DraftChatPayload) {
    stashDraftChatPayload(payload);
    router.push("/");
  }

  function handleModeChange(nextMode: OptimizeMode) {
    if (nextMode === "general") {
      setMode("general");
      setSelectedProjectId("");
      setJobDescription("");
      return;
    }
    if (!selectedProjectId) return;
    setMode("targeted");
  }

  // 携带当前简历上下文进入 AI 对话
  function handleStartChat() {
    if (!result || !activeHistoryId) return;
    const active = historyRecords.find((r) => r.id === activeHistoryId);
    if (active) {
      openChatWithContext(buildChatContextFromHistory(active));
      return;
    }
    openChatWithContext({
      resume,
      jobDescription: jobDescription || undefined,
      optimizeSummary: result.summary,
      historyId: activeHistoryId,
      projectId: selectedProjectId || undefined,
      autoMessage: defaultAutoMessageFromResult(result, mode),
    });
  }

  function handleContinueChat(record: HistoryRecord) {
    openChatWithContext(buildChatContextFromHistory(record));
  }

  async function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    if (!projectId) {
      setMode("general");
      setJobDescription("");
      return;
    }
    try {
      const project = await fetchProject(projectId);
      if (!project.jobDescription?.trim()) {
        setError("该求职项目尚未填写 JD，请先在「求职项目」中补充");
        setSelectedProjectId("");
        setMode("general");
        setJobDescription("");
        return;
      }
      setJobDescription(project.jobDescription);
      setMode("targeted");
      setError("");
    } catch {
      setError("载入求职项目失败");
      setSelectedProjectId("");
      setMode("general");
      setJobDescription("");
    }
  }

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

      <ResumeProfileBar currentContent={resume} onLoad={setResume} />

      {draftRestored && (
        <p className="rounded-lg bg-blue-50 px-4 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          已从账号恢复上次未完成的草稿
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
                onChange={() => handleModeChange("general")}
                className="accent-emerald-600"
              />
              通用优化
            </label>
            <label
              className={`flex items-center gap-2 text-sm ${
                selectedProjectId ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
              title={selectedProjectId ? undefined : "请先选择求职项目"}
            >
              <input
                type="radio"
                name="mode"
                checked={mode === "targeted"}
                disabled={!selectedProjectId}
                onChange={() => handleModeChange("targeted")}
                className="accent-emerald-600"
              />
              针对 JD 定向优化
            </label>
          </div>

          {projects.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="project" className="text-sm font-medium">
                关联求职项目{mode === "targeted" ? " *" : ""}
              </label>
              <select
                id="project"
                value={selectedProjectId}
                onChange={(e) => void handleSelectProject(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">不关联项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {projectOptionLabel(project, projects)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                {mode === "targeted"
                  ? "JD 定向优化需先选择求职项目，JD 将使用项目中的岗位描述"
                  : "选择通用优化时将自动取消项目关联"}
              </p>
            </div>
          )}

          {mode === "targeted" && selectedProjectId && (
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
                readOnly
                rows={6}
                className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300"
              />
              <p className="text-xs text-zinc-400">
                JD 来自所选求职项目，如需修改请前往「求职项目」编辑
              </p>
            </>
          )}

          {projects.length === 0 && mode === "general" && (
            <p className="text-xs text-zinc-500">
              如需 JD 定向优化，请先在
              <button
                type="button"
                onClick={() => router.push("/projects")}
                className="mx-1 text-emerald-600 hover:underline"
              >
                求职项目
              </button>
              中创建岗位并填写 JD
            </p>
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
              onClick={() => void handleClear()}
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
          jobDescription={jobDescription}
          isTargeted={mode === "targeted"}
          activeHistoryId={activeHistoryId}
          savedCoverLetter={savedCoverLetter}
          resumeTemplateId={resumeTemplateId}
          onTemplateChange={handleTemplateChange}
          onCoverLetterSaved={handleCoverLetterSaved}
          onApplyOptimized={handleApplyOptimized}
          onCancel={handleCancel}
          onStartChat={result ? handleStartChat : undefined}
        />
      </form>

      <HistoryPanel
        records={historyRecords}
        activeId={activeHistoryId}
        searchQuery={historySearch}
        onSearchChange={setHistorySearch}
        onRecordsChange={setHistoryRecords}
        onRestore={handleRestoreHistory}
        onContinueChat={handleContinueChat}
      />
    </div>
  );
}
