"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/app/components/AuthProvider";
import {
  createProject,
  deleteProject,
  fetchProject,
  fetchProjects,
} from "@/lib/projects/applications";
import { buildChatContextFromProject } from "@/lib/resume/chat-context";
import { fetchResumeProfile } from "@/lib/resume/profile";
import { stashDraftChatPayload } from "@/lib/resume/draft-chat";
import { DRAFT_OPTIMIZE_KEY } from "@/lib/resume/constants";
import type { JobApplicationSummary } from "@/lib/types/project";

// 求职项目页面
export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<JobApplicationSummary[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    title: "",
    company: "",
    jobDescription: "",
  });

  // 刷新求职项目列表
  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError("");
    void fetchProjects({
      q: q.trim() || undefined,
    })
      .then(setProjects)
      .catch((err) => {
        setProjects([]);
        setLoadError(
          err instanceof ApiError ? err.message : "加载失败，请稍后重试",
        );
      })
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(refresh, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [refresh, q]);

  // 创建求职项目
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      await createProject({
        title: form.title.trim(),
        company: form.company.trim() || undefined,
        jobDescription: form.jobDescription.trim() || undefined,
      });
      setCreateOpen(false);
      setForm({ title: "", company: "", jobDescription: "" });
      refresh();
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "创建失败，请稍后重试",
      );
    } finally {
      setCreating(false);
    }
  }

  async function startOptimize(project: JobApplicationSummary) {
    let resume = "";
    try {
      const profile = await fetchResumeProfile();
      resume = profile?.content ?? "";
    } catch {
      // ignore
    }
    const detail = await fetchProject(project.id);
    sessionStorage.setItem(
      DRAFT_OPTIMIZE_KEY,
      JSON.stringify({
        resume: resume || undefined,
        jobDescription: detail.jobDescription || undefined,
      }),
    );
    router.push(`/resume?projectId=${encodeURIComponent(project.id)}`);
  }

  async function startChat(project: JobApplicationSummary) {
    let resume = "";
    try {
      const profile = await fetchResumeProfile();
      resume = profile?.content ?? "";
    } catch {
      // ignore
    }
    const detail = await fetchProject(project.id);
    stashDraftChatPayload(buildChatContextFromProject(detail, resume));
    router.push("/");
  }

  // 渲染页面
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-y-auto px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">求职项目</h1>
          <p className="mt-1 text-sm text-zinc-500">
            按岗位管理 JD、优化记录与相关对话
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-400">
            每个求职项目对应一个目标岗位。你可以保存 JD，并关联该岗位的简历优化记录与 AI 对话。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError("");
            setCreateOpen(true);
          }}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          新建项目
        </button>
      </header>

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索岗位、公司、JD..."
          className="min-w-[220px] flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-900"
        />
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">加载中...</p>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-sm text-red-600 dark:text-red-300">{loadError}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            重试
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center text-sm text-zinc-500 dark:border-zinc-800">
          <p>暂无求职项目</p>
          <p className="mt-2 text-xs text-zinc-400">
            点击「新建项目」添加目标岗位，或在「简历优化」完成 JD 定向优化后保存为项目
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-base font-semibold hover:text-emerald-600"
                  >
                    {project.company
                      ? `${project.company} · ${project.title}`
                      : project.title}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {project.historyCount} 次优化 · {project.chatCount} 个对话
                    {project.latestScore !== undefined &&
                      ` · 最近评分 ${project.latestScore}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void startOptimize(project)}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-700"
                  >
                    优化简历
                  </button>
                  <button
                    type="button"
                    onClick={() => void startChat(project)}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    开始对话
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void deleteProject(project.id).then(refresh)
                    }
                    className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:text-red-500"
                  >
                    删除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4">
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <h3 className="text-lg font-semibold">新建求职项目</h3>
            <div className="mt-4 space-y-3">
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="岗位名称 *"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
              <input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="公司名称（可选）"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
              <textarea
                value={form.jobDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, jobDescription: e.target.value }))
                }
                placeholder="岗位 JD（可选）"
                rows={5}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
            {createError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
                {createError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={creating}
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {creating ? "创建中..." : "创建"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
