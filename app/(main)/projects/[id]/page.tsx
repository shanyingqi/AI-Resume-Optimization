"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/app/components/AuthProvider";
import { fetchProject, updateProject } from "@/lib/projects/applications";
import {
  buildChatContextFromHistory,
  buildChatContextFromProject,
} from "@/lib/resume/chat-context";
import { fetchHistory, formatHistoryTime } from "@/lib/resume/history";
import { fetchResumeProfile } from "@/lib/resume/profile";
import { stashDraftChatPayload } from "@/lib/resume/draft-chat";
import { DRAFT_OPTIMIZE_KEY, MAX_JD_CHARS } from "@/lib/resume/constants";
import type { JobApplicationDetail } from "@/lib/types/project";
import type { HistoryRecord } from "@/lib/types/resume";

function projectFormFromDetail(project: JobApplicationDetail) {
  return {
    title: project.title,
    company: project.company ?? "",
    jobDescription: project.jobDescription ?? "",
  };
}

// 求职项目详情页面
export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<JobApplicationDetail | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [mainResume, setMainResume] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", jobDescription: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // 获取求职项目详情
  useEffect(() => {
    if (!params.id) return;
    void fetchProject(params.id)
      .then((detail) => {
        setProject(detail);
        setForm(projectFormFromDetail(detail));
      })
      .catch(() => setProject(null));
    void fetchHistory({ projectId: params.id })
      .then(setHistory)
      .catch(() => setHistory([]));
    void fetchResumeProfile()
      .then((profile) => setMainResume(profile?.content ?? ""))
      .catch(() => setMainResume(""));
  }, [params.id]);

  function openChat(payload: ReturnType<typeof buildChatContextFromHistory>) {
    stashDraftChatPayload(payload);
    router.push("/");
  }

  function continueChat(record: HistoryRecord) {
    openChat(buildChatContextFromHistory(record));
  }

  function startProjectChat() {
    if (!project) return;
    openChat(buildChatContextFromProject(project, mainResume));
  }

  async function startOptimize() {
    if (!project) return;
    let resume = mainResume;
    if (!resume.trim()) {
      try {
        const profile = await fetchResumeProfile();
        resume = profile?.content ?? "";
      } catch {
        // ignore
      }
    }
    sessionStorage.setItem(
      DRAFT_OPTIMIZE_KEY,
      JSON.stringify({
        resume: resume || undefined,
        jobDescription: project.jobDescription || undefined,
      }),
    );
    router.push(`/resume?projectId=${encodeURIComponent(project.id)}`);
  }

  function startEdit() {
    if (!project) return;
    setForm(projectFormFromDetail(project));
    setSaveError("");
    setEditing(true);
  }

  function cancelEdit() {
    if (project) setForm(projectFormFromDetail(project));
    setSaveError("");
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !form.title.trim()) return;
    if (form.jobDescription.length > MAX_JD_CHARS) {
      setSaveError(`岗位 JD 不能超过 ${MAX_JD_CHARS.toLocaleString()} 字`);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const updated = await updateProject(project.id, {
        title: form.title.trim(),
        company: form.company.trim() || null,
        jobDescription: form.jobDescription.trim() || null,
      });
      setProject(updated);
      setForm(projectFormFromDetail(updated));
      setEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "保存失败，请稍后重试",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        加载中...
      </div>
    );
  }

  const projectTitle = project.company
    ? `${project.company} · ${project.title}`
    : project.title;

  return (
    <div className="mx-auto max-w-5xl space-y-6 overflow-y-auto px-4 py-8 sm:px-6">
      <div>
        <Link href="/projects" className="text-sm text-zinc-500 hover:text-emerald-600">
          ← 返回项目列表
        </Link>
        {!editing ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">{projectTitle}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {project.historyCount} 次优化 · {project.chatCount} 个对话
            </p>
          </>
        ) : (
          <h1 className="mt-2 text-2xl font-bold">编辑求职项目</h1>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {!editing && (
            <>
              <button
                type="button"
                onClick={() => void startOptimize()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                针对此岗位优化简历
              </button>
              <button
                type="button"
                onClick={startProjectChat}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                就此项目开始对话
              </button>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                编辑
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={(e) => void handleSave(e)}
          className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
                岗位名称 *
              </label>
              <input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label htmlFor="company" className="mb-1.5 block text-sm font-medium">
                公司名称
              </label>
              <input
                id="company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="可选"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="jd" className="text-sm font-medium">
                  岗位 JD
                </label>
                {form.jobDescription.length > 0 && (
                  <span
                    className={`text-xs ${
                      form.jobDescription.length > MAX_JD_CHARS
                        ? "text-red-600"
                        : "text-zinc-500"
                    }`}
                  >
                    {form.jobDescription.length.toLocaleString()} /{" "}
                    {MAX_JD_CHARS.toLocaleString()} 字
                  </span>
                )}
              </div>
              <textarea
                id="jd"
                value={form.jobDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, jobDescription: e.target.value }))
                }
                placeholder="粘贴或输入目标岗位的职位描述"
                rows={10}
                className="w-full resize-y rounded-xl border border-zinc-200 px-4 py-2.5 text-sm leading-relaxed outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          </div>
          {saveError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
              {saveError}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={cancelEdit}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      ) : (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">岗位 JD</h2>
            <button
              type="button"
              onClick={startEdit}
              className="text-xs text-emerald-600 hover:underline"
            >
              编辑
            </button>
          </div>
          {project.jobDescription ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
              {project.jobDescription}
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              暂无岗位 JD，
              <button
                type="button"
                onClick={startEdit}
                className="text-emerald-600 hover:underline"
              >
                点击添加
              </button>
            </p>
          )}
        </section>
      )}

      {!editing && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">优化记录</h2>
          {history.length === 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-zinc-500">暂无关联优化记录</p>
              <p className="text-xs text-zinc-400">
                点击上方「针对此岗位优化简历」，或在简历优化页选择本项目后完成优化
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-800"
                >
                  <div>
                    <p className="font-medium">
                      {record.title || record.resumePreview}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatHistoryTime(record.createdAt)} · 评分 {record.score}
                      {record.jdMatchRate !== undefined &&
                        ` · 匹配 ${record.jdMatchRate}%`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/resume?historyId=${record.id}`}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700"
                    >
                      查看
                    </Link>
                    <button
                      type="button"
                      onClick={() => continueChat(record)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
                    >
                      就此记录提问
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!editing && project.chatSessionIds.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">相关对话</h2>
          <ul className="mt-3 space-y-2">
            {project.chatSessionIds.map((id) => (
              <li key={id}>
                <Link
                  href={`/chat/${id}`}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  打开对话 {id.slice(0, 8)}…
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
