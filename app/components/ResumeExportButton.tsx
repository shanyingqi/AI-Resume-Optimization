"use client";

import { useState } from "react";
import AppModal from "./AppModal";
import ExportOverlay from "./ExportOverlay";
import type { ResumeTemplateId, StructuredResume } from "@/lib/types/resume";

type ExportFormat = "pdf" | "docx";

interface ResumeExportButtonProps {
  data: StructuredResume;
  templateId: ResumeTemplateId;
  filenamePrefix?: string;
  label?: string;
  /** 是否显示 PDF 导出（默认开启） */
  pdfEnabled?: boolean;
}

// 简历导出按钮
export default function ResumeExportButton({
  data,
  templateId,
  filenamePrefix = "优化简历",
  label = "导出简历",
  pdfEnabled = true,
}: ResumeExportButtonProps) {
  const [format, setFormat] = useState<ExportFormat>(pdfEnabled ? "pdf" : "docx");
  const [exporting, setExporting] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const overlayMessage =
    format === "pdf" ? "正在生成矢量 PDF，请稍候..." : "正在导出 Word，请稍候...";

  // 导出简历
  async function handleExport() {
    setExporting(true);
    try {
      if (format === "pdf") {
        const { downloadResumePdf } = await import("@/lib/resume/pdf/export-resume-pdf");
        await downloadResumePdf(data, templateId, filenamePrefix);
      } else {
        const { downloadResumeDocx } = await import("@/lib/resume/export-resume-docx");
        await downloadResumeDocx(data, templateId, filenamePrefix);
      }
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : "导出失败，请重试");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {exporting && <ExportOverlay message={overlayMessage} />}

      <div className="flex items-center">
        {pdfEnabled ? (
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            disabled={exporting}
            aria-label="选择导出格式"
            className="rounded-l-lg border border-r-0 border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="pdf">PDF</option>
            <option value="docx">Word</option>
          </select>
        ) : null}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className={`bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 ${
            pdfEnabled ? "rounded-r-lg" : "rounded-lg"
          }`}
        >
          {exporting ? "导出中..." : label}
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
