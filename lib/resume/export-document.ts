import { Document, Packer, Paragraph, TextRun } from "docx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type ExportFormat = "pdf" | "docx";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 15;

// 下载 Blob 文件到本地
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// 将文本转换为段落数组
function textToParagraphs(text: string): Paragraph[] {
  return text.split("\n").map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line || " ")],
        spacing: { after: 120 },
      }),
  );
}

// 下载为 Word 文档
export async function downloadAsDocx(content: string, filename: string) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: textToParagraphs(content),
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
}

// 创建 PDF 渲染容器
function createPdfRenderContainer(content: string) {
  const container = document.createElement("div");
  container.style.cssText = [
    "position: fixed",
    "left: 0",
    "top: 0",
    "width: 794px",
    "padding: 40px",
    "box-sizing: border-box",
    'font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
    "font-size: 14px",
    "line-height: 1.6",
    "color: #000",
    "background: #fff",
    "white-space: pre-wrap",
    "word-break: break-word",
    "opacity: 0",
    "pointer-events: none",
    "z-index: -1",
  ].join(";");
  container.textContent = content;
  return container;
}

// 下载为 PDF 文档
export async function downloadAsPdf(content: string, filename: string) {
  const container = createPdfRenderContainer(content);
  document.body.appendChild(container);

  try {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const contentWidth = A4_WIDTH_MM - MARGIN_MM * 2;
    const contentHeight = A4_HEIGHT_MM - MARGIN_MM * 2;
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    let offsetY = 0;
    let page = 0;

    while (offsetY < imgHeight) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", MARGIN_MM, MARGIN_MM - offsetY, imgWidth, imgHeight);
      offsetY += contentHeight;
      page += 1;
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

// 下载内容为指定格式
export async function downloadContent(
  content: string,
  baseFilename: string,
  format: ExportFormat,
) {
  const filename = `${baseFilename}-${Date.now()}`;
  if (format === "docx") {
    await downloadAsDocx(content, `${filename}.docx`);
  } else {
    await downloadAsPdf(content, `${filename}.pdf`);
  }
}
