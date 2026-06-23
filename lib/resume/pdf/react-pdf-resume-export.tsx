import { pdf } from "@react-pdf/renderer";
import type { ResumeTemplateId, StructuredResume } from "@/lib/types/resume";
import ResumePdfDocument from "./ResumePdfDocument";
import { ensurePdfFontsRegistered } from "./react-pdf-setup";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 使用 react-pdf 导出与 HTML 预览布局一致的矢量 PDF */
export async function downloadResumePdf(
  data: StructuredResume,
  templateId: ResumeTemplateId,
  filenamePrefix: string,
) {
  if (!data.basics.name?.trim()) {
    throw new Error("简历数据不完整，请重新优化后再导出");
  }

  await ensurePdfFontsRegistered();

  const blob = await pdf(
    <ResumePdfDocument data={data} templateId={templateId} />,
  ).toBlob();

  triggerDownload(blob, `${filenamePrefix}-${Date.now()}.pdf`);
}
