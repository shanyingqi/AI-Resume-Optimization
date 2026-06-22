import { Document, Packer, Paragraph, TextRun } from "docx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type ExportFormat = "pdf" | "docx";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 15;
const PDF_RENDER_WIDTH_PX = 794;
const CONTAINER_PADDING_PX = 40;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;
const PX_PER_MM = PDF_RENDER_WIDTH_PX / A4_WIDTH_MM;
const TEXT_WIDTH_PX = PDF_RENDER_WIDTH_PX - CONTAINER_PADDING_PX * 2;
/** 单页正文区最大高度（扣除内边距，并留 8px 防止行尾裁切） */
const PAGE_TEXT_MAX_HEIGHT_PX =
  Math.floor(CONTENT_HEIGHT_MM * PX_PER_MM) - CONTAINER_PADDING_PX * 2 - 8;

const PDF_TEXT_STYLE = [
  `width: ${TEXT_WIDTH_PX}px`,
  'font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
  "font-size: 14px",
  "line-height: 1.6",
  "color: #000000",
  "white-space: pre-wrap",
  "overflow-wrap: anywhere",
  "word-break: break-word",
].join(";");

let measureEl: HTMLDivElement | null = null;

// 下载 Blob 文件
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

// 获取测量元素
function getMeasureEl(): HTMLDivElement {
  if (!measureEl) {
    measureEl = document.createElement("div");
    measureEl.style.cssText = [
      "position: fixed",
      "left: -10000px",
      "top: 0",
      "visibility: hidden",
      "pointer-events: none",
      PDF_TEXT_STYLE,
    ].join(";");
    document.body.appendChild(measureEl);
  }
  return measureEl;
}

// 清理测量元素
function cleanupMeasureEl() {
  if (measureEl?.parentNode) {
    measureEl.parentNode.removeChild(measureEl);
    measureEl = null;
  }
}

// 测量文本高度
function measureTextHeight(text: string): number {
  const el = getMeasureEl();
  el.textContent = text || " ";
  return el.offsetHeight;
}

// 查找分割索引
function findSplitIndex(text: string, maxHeightPx: number): number {
  if (measureTextHeight(text) <= maxHeightPx) return text.length;

  let low = 1;
  let high = text.length;
  let best = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (measureTextHeight(text.slice(0, mid)) <= maxHeightPx) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const slice = text.slice(0, best);
  const breakChars = ["\n", " ", "，", "。", "；", "、", "-", "·"];
  let splitAt = best;
  for (const ch of breakChars) {
    const idx = slice.lastIndexOf(ch);
    if (idx > best * 0.4) {
      splitAt = idx + (ch === " " ? 1 : ch === "\n" ? 1 : 1);
      if (measureTextHeight(text.slice(0, splitAt)) <= maxHeightPx) break;
    }
  }

  return Math.max(1, splitAt);
}

// 分割超长行
function splitOversizedLine(line: string, maxHeightPx: number): string[] {
  if (!line) return [""];
  if (measureTextHeight(line) <= maxHeightPx) return [line];

  const chunks: string[] = [];
  let remaining = line;

  while (remaining && measureTextHeight(remaining) > maxHeightPx) {
    const splitAt = findSplitIndex(remaining, maxHeightPx);
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  if (remaining) chunks.push(remaining);
  return chunks.length ? chunks : [""];
}

/** 按行高测量分页，保证不在行中间截断 */
function paginateContent(content: string, maxHeightPx: number): string[] {
  const lines = content.split("\n");
  const pages: string[] = [];
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length > 0) {
      pages.push(currentLines.join("\n"));
      currentLines = [];
    }
  };

  for (const rawLine of lines) {
    for (const line of splitOversizedLine(rawLine, maxHeightPx)) {
      const candidate = currentLines.length
        ? `${currentLines.join("\n")}\n${line}`
        : line;

      if (currentLines.length > 0 && measureTextHeight(candidate) > maxHeightPx) {
        flush();
        currentLines = [line];
      } else {
        currentLines.push(line);
      }
    }
  }

  flush();
  return pages.length ? pages : [content];
}

// 创建 PDF 页面容器
function createPdfPageContainer(pageText: string) {
  const container = document.createElement("div");
  container.setAttribute("data-pdf-export", "true");
  container.style.cssText = [
    "position: fixed",
    "left: 0",
    "top: 0",
    `width: ${PDF_RENDER_WIDTH_PX}px`,
    `padding: ${CONTAINER_PADDING_PX}px`,
    "box-sizing: border-box",
    'font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
    "font-size: 14px",
    "line-height: 1.6",
    "color: #000000",
    "background: #ffffff",
    "white-space: pre-wrap",
    "overflow-wrap: anywhere",
    "word-break: break-word",
    "opacity: 0",
    "pointer-events: none",
    "z-index: -1",
  ].join(";");
  container.textContent = pageText;
  return container;
}

// 断言 Canvas 有内容
function assertCanvasHasContent(canvas: HTMLCanvasElement) {
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error("PDF 内容渲染失败，请尝试下载 Word 格式");
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("PDF 内容渲染失败，请尝试下载 Word 格式");
  }

  const sample = ctx.getImageData(
    0,
    0,
    Math.min(canvas.width, 200),
    Math.min(canvas.height, 200),
  ).data;
  const hasInk = sample.some((value, index) => index % 4 !== 3 && value < 250);
  if (!hasInk) {
    throw new Error("PDF 内容为空，请尝试下载 Word 格式");
  }
}

// 渲染页面到 Canvas
async function renderPageToCanvas(pageText: string): Promise<HTMLCanvasElement> {
  const container = createPdfPageContainer(pageText);
  document.body.appendChild(container);

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    return await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      width: PDF_RENDER_WIDTH_PX,
      windowWidth: PDF_RENDER_WIDTH_PX,
      onclone: (clonedDoc) => {
        const cloned = clonedDoc.querySelector("[data-pdf-export]");
        if (cloned instanceof HTMLElement) {
          cloned.style.opacity = "1";
          cloned.style.visibility = "visible";
          cloned.style.color = "#000000";
          cloned.style.background = "#ffffff";
          cloned.style.position = "static";
        }
      },
    });
  } finally {
    document.body.removeChild(container);
  }
}

// 添加页面 Canvas 到 PDF
function addPageCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  pageIndex: number,
) {
  const imgHeight = (canvas.height * CONTENT_WIDTH_MM) / canvas.width;
  const drawHeight = Math.min(imgHeight, CONTENT_HEIGHT_MM);

  if (pageIndex > 0) pdf.addPage();
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    MARGIN_MM,
    MARGIN_MM,
    CONTENT_WIDTH_MM,
    drawHeight,
  );
}

export async function downloadAsPdf(content: string, filename: string) {
  if (!content.trim()) {
    throw new Error("没有可导出的内容");
  }

  try {
    await document.fonts.ready;
    const pages = paginateContent(content, PAGE_TEXT_MAX_HEIGHT_PX);
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    for (let i = 0; i < pages.length; i++) {
      const canvas = await renderPageToCanvas(pages[i]);
      assertCanvasHasContent(canvas);
      addPageCanvasToPdf(pdf, canvas, i);
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    cleanupMeasureEl();
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
