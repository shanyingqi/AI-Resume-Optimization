"use client";

import { useState } from "react";
import ComparePanel from "./ComparePanel";
import DownloadButton from "./DownloadButton";
import { formatOptimizeReport } from "@/lib/resume/export-report";
import type { OptimizeResult } from "@/lib/types/resume";

const severityColor = {
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
} as const;

type ResultTab = "analysis" | "compare";

interface OptimizeResultPanelProps {
  result: OptimizeResult | null;
  loading: boolean;
  originalResume: string;
  isTargeted: boolean;
}

// 复制文本到剪贴板
async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

// JD 匹配度条形图
function MatchRateBar({ rate, summary }: { rate: number; summary?: string }) {
  const color =
    rate >= 80
      ? "bg-emerald-500"
      : rate >= 60
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
          JD 匹配度
        </p>
        <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
          {rate}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
        />
      </div>
      {summary && (
        <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
          {summary}
        </p>
      )}
    </div>
  );
}

// 优化结果面板
export default function OptimizeResultPanel({
  result,
  loading,
  originalResume,
  isTargeted,
}: OptimizeResultPanelProps) {
  const [copied, setCopied] = useState("");
  const [tab, setTab] = useState<ResultTab>("analysis");

  async function handleCopy(label: string, text: string) {
    await copyText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3 text-sm text-zinc-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          AI 正在分析简历...
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        优化结果将显示在这里，包括评分、JD 匹配度、左右对比与问题诊断
      </div>
    );
  }

  const optimizedText = result.optimizedSections
    .map((s) => `【${s.title}】\n${s.optimized}`)
    .join("\n\n");

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setTab("analysis")}
          className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
            tab === "analysis"
              ? "bg-emerald-600 text-white"
              : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          分析报告
        </button>
        <button
          type="button"
          onClick={() => setTab("compare")}
          className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
            tab === "compare"
              ? "bg-emerald-600 text-white"
              : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          左右对比
        </button>
      </div>

      {tab === "compare" ? (
        <ComparePanel
          original={originalResume}
          optimized={result.fullOptimizedResume}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${
                  result.score >= 80
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : result.score >= 60
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                }`}
              >
                {result.score}
              </div>
              <div>
                <p className="font-medium">综合评分</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {result.summary}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <DownloadButton
                content={formatOptimizeReport(result)}
                filenamePrefix="简历优化报告"
                label="下载报告"
              />
              <button
                type="button"
                onClick={() =>
                  handleCopy("report", formatOptimizeReport(result))
                }
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {copied === "report" ? "已复制" : "复制报告"}
              </button>
            </div>
          </div>

          {isTargeted && result.jdMatchRate != null && (
            <MatchRateBar
              rate={result.jdMatchRate}
              summary={result.jdMatchSummary}
            />
          )}

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
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {issue.problem}
                  </p>
                  <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                    → {issue.suggestion}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">改写示例</h2>
              <button
                type="button"
                onClick={() => handleCopy("optimized", optimizedText)}
                className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {copied === "optimized" ? "已复制" : "复制全部优化内容"}
              </button>
            </div>
            <ul className="space-y-3">
              {result.optimizedSections.map((section, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium">{section.title}</p>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(`section-${i}`, section.optimized)
                      }
                      className="text-xs text-zinc-500 hover:text-emerald-600"
                    >
                      {copied === `section-${i}` ? "已复制" : "复制"}
                    </button>
                  </div>
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
  );
}
