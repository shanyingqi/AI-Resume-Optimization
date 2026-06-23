"use client";

import { useEffect, useRef, useState } from "react";
import AppModal from "./AppModal";
import DownloadButton from "./DownloadButton";
import type { CoverLetterResult } from "@/lib/types/resume";

interface CoverLetterPanelProps {
  resume: string;
  jobDescription: string;
  historyId?: string;
  initialCoverLetter?: CoverLetterResult | null;
  onSaved?: (coverLetter: CoverLetterResult) => void;
}

// 复制文本到剪贴板
async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

// 求职信生成面板
export default function CoverLetterPanel({
  resume,
  jobDescription,
  historyId,
  initialCoverLetter,
  onSaved,
}: CoverLetterPanelProps) {
  const [result, setResult] = useState<CoverLetterResult | null>(
    initialCoverLetter ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(initialCoverLetter ?? null);
  }, [historyId, initialCoverLetter]);

  // 生成求职信
  async function handleGenerate() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
        signal: controller.signal,
      });

      const data = (await res.json()) as CoverLetterResult & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "生成失败");
      }

      setResult(data);
      if (historyId) {
        onSaved?.(data);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setErrorModal(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  // 取消生成
  function handleCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }

  // 复制全文
  async function handleCopy() {
    if (!result) return;
    await copyText(result.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          基于当前简历与 JD 生成定制化求职信（Cover Letter）
          {result && historyId && (
            <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
              已保存到历史记录
            </span>
          )}
        </p>
        {loading ? (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            取消生成
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            {result ? "重新生成" : "生成求职信"}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 py-12 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            AI 正在撰写求职信...
          </span>
        </div>
      )}

      {!loading && !result && (
        <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          点击「生成求职信」，AI 将结合简历与岗位 JD 撰写 Cover Letter
        </div>
      )}

      {!loading && result && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <DownloadButton
              content={result.fullText}
              filenamePrefix="求职信"
              label="下载求职信"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {copied ? "已复制" : "复制全文"}
            </button>
          </div>

          {result.highlights.length > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="mb-2 text-xs font-medium text-blue-900 dark:text-blue-200">
                本信突出亮点
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs text-blue-800 dark:text-blue-300">
                {result.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="max-h-[480px] overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed break-words whitespace-pre-wrap text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {result.fullText}
          </div>
        </div>
      )}

      <AppModal
        open={Boolean(errorModal)}
        title="生成失败"
        message={errorModal}
        type="alert"
        confirmLabel="知道了"
        onConfirm={() => setErrorModal("")}
        onCancel={() => setErrorModal("")}
      />
    </div>
  );
}
