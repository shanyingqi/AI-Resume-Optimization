"use client";

import { useState } from "react";
import type { OptimizeMode, OptimizeResult } from "@/lib/types/resume";

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

const severityColor = {
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
} as const;

export default function ResumeOptimizer() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState<OptimizeMode>("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<(OptimizeResult & { mock?: boolean }) | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          AI 简历优化
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          让简历更专业、更匹配岗位
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          粘贴简历原文，可选填目标岗位 JD，AI 将给出评分、问题诊断、改写示例与关键词建议。
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="resume" className="text-sm font-medium">
              简历内容
            </label>
            <button
              type="button"
              onClick={() => setResume(SAMPLE_RESUME)}
              className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
            >
              填入示例
            </button>
          </div>
          <textarea
            id="resume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="粘贴你的简历文本..."
            rows={16}
            required
            className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />

          <div className="flex gap-4">
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
                rows={8}
                required={mode === "targeted"}
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "分析中..." : "开始优化"}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {!result && !loading && (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              优化结果将显示在这里，包括评分、问题清单、改写示例与关键词建议
            </div>
          )}

          {loading && (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col items-center gap-3 text-sm text-zinc-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                AI 正在分析简历...
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              {result.mock && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  当前为演示模式（未配置 OPENAI_API_KEY），结果为示例数据
                </p>
              )}

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {result.score}
                </div>
                <div>
                  <p className="font-medium">综合评分</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{result.summary}</p>
                </div>
              </div>

              <section>
                <h2 className="mb-2 text-sm font-semibold">问题诊断</h2>
                <ul className="space-y-2">
                  {result.issues.map((issue, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-zinc-100 p-3 text-sm dark:border-zinc-800"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-medium">{issue.section}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${severityColor[issue.severity]}`}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400">{issue.problem}</p>
                      <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                        → {issue.suggestion}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold">改写示例</h2>
                <ul className="space-y-3">
                  {result.optimizedSections.map((section, i) => (
                    <li
                      key={i}
                      className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50"
                    >
                      <p className="mb-1 font-medium">{section.title}</p>
                      <p className="text-zinc-500 line-through">{section.original}</p>
                      <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                        {section.optimized}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold">建议关键词</h2>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold">求职建议</h2>
                <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {result.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
