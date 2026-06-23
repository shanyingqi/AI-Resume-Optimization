import type { ResumeTemplateId, StructuredResume } from "@/lib/types/resume";

/** 将结构化简历导出为矢量 PDF 并触发浏览器下载 */
export async function downloadResumePdf(
  data: StructuredResume,
  templateId: ResumeTemplateId,
  filenamePrefix: string,
) {
  const { downloadResumePdf: exportPdf } = await import("./pdf-lib-resume-export");
  await exportPdf(data, templateId, filenamePrefix);
}
