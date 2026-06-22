"use client";

import { useState } from "react";
import AppModal from "./AppModal";
import ExportOverlay from "./ExportOverlay";
import { downloadContent, type ExportFormat } from "@/lib/resume/export-document";

interface DownloadButtonProps {
  content: string;
  filenamePrefix: string;
  label: string;
}

export default function DownloadButton({
  content,
  filenamePrefix,
  label,
}: DownloadButtonProps) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [downloading, setDownloading] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const overlayMessage =
    format === "pdf" ? "正在生成 PDF，请稍候..." : "正在导出 Word，请稍候...";

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadContent(content, filenamePrefix, format);
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : "导出失败，请重试");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {downloading && <ExportOverlay message={overlayMessage} />}

      <div className="flex items-center">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          disabled={downloading}
          aria-label="选择下载格式"
          className="rounded-l-lg border border-r-0 border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="pdf">PDF</option>
          <option value="docx">Word</option>
        </select>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-r-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {downloading ? "导出中..." : label}
        </button>
      </div>

      <AppModal
        open={Boolean(errorModal)}
        title="导出失败"
        message={errorModal}
        type="alert"
        confirmLabel="知道了"
        onConfirm={() => setErrorModal("")}
        onCancel={() => setErrorModal("")}
      />
    </>
  );
}
