"use client";

import { useState } from "react";
import { downloadContent, type ExportFormat } from "@/lib/resume/export-document";

interface DownloadButtonProps {
  content: string;
  filenamePrefix: string;
  label: string;
}

// 下载按钮，支持 PDF 和 Word 格式
export default function DownloadButton({
  content,
  filenamePrefix,
  label,
}: DownloadButtonProps) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [downloading, setDownloading] = useState(false);

  // 处理下载请求
  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadContent(content, filenamePrefix, format);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center">
      <select
        value={format}
        onChange={(e) => setFormat(e.target.value as ExportFormat)}
        disabled={downloading}
        aria-label="选择下载格式"
        className="rounded-l-lg border border-r-0 border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {/* <option value="pdf">PDF</option> */}
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
  );
}
