/* eslint-disable react-hooks/static-components */
"use client";

import { useMemo } from "react";
import ResumeExportButton from "./ResumeExportButton";
import {
  getResumeTemplateComponent,
  RESUME_TEMPLATES,
} from "./resume-templates/registry";
import { resolveStructuredResume } from "@/lib/resume/structured-resume";
import type { ResumeTemplateId, StructuredResume } from "@/lib/types/resume";

interface ResumePreviewPanelProps {
  structuredResume?: StructuredResume;
  fullOptimizedResume: string;
  templateId: ResumeTemplateId;
  onTemplateChange: (templateId: ResumeTemplateId) => void;
}

// 简历预览面板
export default function ResumePreviewPanel({
  structuredResume,
  fullOptimizedResume,
  templateId,
  onTemplateChange,
}: ResumePreviewPanelProps) {
  const resumeData = useMemo(
    () => resolveStructuredResume(structuredResume, fullOptimizedResume),
    [structuredResume, fullOptimizedResume],
  );

  const TemplateComponent = getResumeTemplateComponent(templateId);
  const activeTemplate = RESUME_TEMPLATES.find((item) => item.id === templateId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            选择模板预览优化版简历，支持导出 PDF 或 Word
          </p>
          {activeTemplate && (
            <p className="mt-0.5 text-xs text-zinc-500">{activeTemplate.description}</p>
          )}
        </div>
        <ResumeExportButton data={resumeData} templateId={templateId} />
      </div>

      <div className="flex flex-wrap gap-2">
        {RESUME_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onTemplateChange(template.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${
              templateId === template.id
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {template.name}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <TemplateComponent data={resumeData} />
      </div>
    </div>
  );
}
