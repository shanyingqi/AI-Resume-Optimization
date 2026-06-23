import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFPage, type PDFFont, rgb } from "pdf-lib";
import type { ResumeTemplateId, StructuredResume } from "@/lib/types/resume";
import { formatContactLine } from "@/lib/resume/structured-resume";
import { RESUME_TOKENS } from "@/lib/resume/template-tokens";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MM = 2.834645669;
const MARGIN_MM = 15;
const SIDEBAR_MM = 52;

const COLOR_PRIMARY = rgb(0.067, 0.094, 0.153);
const COLOR_MUTED = rgb(0.42, 0.45, 0.5);
const COLOR_ACCENT = rgb(0.02, 0.59, 0.41);
const COLOR_BORDER = rgb(0.898, 0.906, 0.918);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_SIDEBAR = rgb(0.067, 0.094, 0.153);

let cachedFontBytes: ArrayBuffer | null = null;

/** 加载字体文件 */
async function loadFontBytes(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  const response = await fetch("/fonts/NotoSansSC-Regular.otf");
  if (!response.ok) {
    throw new Error("简历字体加载失败，请刷新页面后重试");
  }
  const buffer = await response.arrayBuffer();
  const header = new Uint8Array(buffer.slice(0, 4));
  const magic = String.fromCharCode(...header);
  if (magic !== "OTTO" && magic !== "\0\x01\0\0") {
    throw new Error("简历字体文件无效，请联系管理员更新字体资源");
  }
  cachedFontBytes = buffer;
  return buffer;
}

/** 计算顶部位置 */
function mmTop(page: PDFPage, topMm: number): number {
  const { height } = page.getSize();
  return height - topMm * MM;
}

/** 换行处理 */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";

  for (const char of text) {
    const next = current + char;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/** 简历 PDF 构建器 */
class ResumePdfBuilder {
  private doc: PDFDocument;
  private font: PDFFont;
  private page: PDFPage;
  private topMm = MARGIN_MM;
  private templateId: ResumeTemplateId;
  private contentXmm = MARGIN_MM;
  private contentWmm = 210 - MARGIN_MM * 2;

  constructor(doc: PDFDocument, font: PDFFont, templateId: ResumeTemplateId) {
    this.doc = doc;
    this.font = font;
    this.templateId = templateId;
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    if (templateId === "sidebar") {
      this.contentXmm = SIDEBAR_MM + 8;
      this.contentWmm = 210 - this.contentXmm - MARGIN_MM;
    }
  }

  /** 确保有足够的空间 */
  private ensureSpace(neededMm: number) {
    if (this.topMm + neededMm <= 297 - MARGIN_MM) return;
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.topMm = MARGIN_MM;
    if (this.templateId === "sidebar") {
      this.drawSidebarBg();
    }
  }

  /** 绘制侧栏背景 */
  private drawSidebarBg() {
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: SIDEBAR_MM * MM,
      height: PAGE_H,
      color: COLOR_SIDEBAR,
    });
  }

  /** 绘制文本行 */
  private drawTextLine(
    text: string,
    xMm: number,
    size: number,
    color = COLOR_PRIMARY,
    maxWidthMm?: number,
  ) {
    const maxW = (maxWidthMm ?? this.contentWmm) * MM;
    const lines = wrapText(text, this.font, size, maxW);
    for (const line of lines) {
      this.ensureSpace((size / MM) * 0.45 + 1.5);
      this.page.drawText(line, {
        x: xMm * MM,
        y: mmTop(this.page, this.topMm) - size * 0.35,
        size,
        font: this.font,
        color,
      });
      this.topMm += (size / MM) * 0.42 + 1.2;
    }
  }

  /** 绘制标题 */
  private drawSectionTitle(title: string) {
    this.ensureSpace(10);
    const size = (RESUME_TOKENS.fontSize.sectionTitle + 1) * 0.75;
    this.page.drawText(title, {
      x: this.contentXmm * MM,
      y: mmTop(this.page, this.topMm) - size * 0.35,
      size,
      font: this.font,
      color: COLOR_ACCENT,
    });
    this.topMm += 4;
    const yLine = mmTop(this.page, this.topMm);
    this.page.drawLine({
      start: { x: this.contentXmm * MM, y: yLine },
      end: { x: (this.contentXmm + this.contentWmm) * MM, y: yLine },
      thickness: 0.5,
      color: COLOR_BORDER,
    });
    this.topMm += 5;
  }

  /** 绘制头部 */
  drawHeader(data: StructuredResume) {
    if (this.templateId === "modern") {
      this.page.drawRectangle({
        x: 0,
        y: PAGE_H - 32 * MM,
        width: PAGE_W,
        height: 32 * MM,
        color: COLOR_ACCENT,
      });
      this.topMm = 12;
      this.drawTextLine(data.basics.name, MARGIN_MM, RESUME_TOKENS.fontSize.name * 0.85, COLOR_WHITE);
      if (data.basics.title) {
        this.drawTextLine(data.basics.title, MARGIN_MM, RESUME_TOKENS.fontSize.subtitle * 0.75, rgb(0.9, 0.97, 0.95));
      }
      const contact = formatContactLine(data.basics);
      if (contact) {
        this.drawTextLine(contact, MARGIN_MM, RESUME_TOKENS.fontSize.small * 0.75, rgb(0.85, 0.95, 0.9));
      }
      this.topMm = 38;
      return;
    }

    if (this.templateId === "sidebar") {
      this.drawSidebarBg();
      let sy = 18;
      const drawSide = (text: string, size: number, color: typeof COLOR_WHITE) => {
        const lines = wrapText(text, this.font, size, (SIDEBAR_MM - 10) * MM);
        for (const line of lines) {
          this.page.drawText(line, {
            x: 8 * MM,
            y: mmTop(this.page, sy) - size * 0.35,
            size,
            font: this.font,
            color,
          });
          sy += (size / MM) * 0.42 + 1.5;
        }
      };
      drawSide(data.basics.name, 13, COLOR_WHITE);
      if (data.basics.title) drawSide(data.basics.title, 9, rgb(0.82, 0.82, 0.82));
      const contact = formatContactLine(data.basics);
      if (contact) drawSide(contact, 8, rgb(0.7, 0.7, 0.7));
      this.topMm = MARGIN_MM;
      return;
    }

    // classic
    this.drawTextLine(data.basics.name, MARGIN_MM, RESUME_TOKENS.fontSize.name * 0.85);
    if (data.basics.title) {
      this.drawTextLine(data.basics.title, MARGIN_MM, RESUME_TOKENS.fontSize.subtitle * 0.75, COLOR_MUTED);
    }
    const contact = formatContactLine(data.basics);
    if (contact) {
      this.drawTextLine(contact, MARGIN_MM, RESUME_TOKENS.fontSize.small * 0.75, COLOR_MUTED);
    }
    this.topMm += 2;
    const yLine = mmTop(this.page, this.topMm);
    this.page.drawLine({
      start: { x: MARGIN_MM * MM, y: yLine },
      end: { x: (210 - MARGIN_MM) * MM, y: yLine },
      thickness: 1.5,
      color: COLOR_ACCENT,
    });
    this.topMm += 7;
  }

  /** 绘制主体 */
  drawBody(data: StructuredResume) {
    if (data.summary) {
      this.drawSectionTitle("个人总结");
      this.drawTextLine(data.summary, this.contentXmm, RESUME_TOKENS.fontSize.body * 0.75);
      this.topMm += 2;
    }

    if (data.experience.length > 0) {
      this.drawSectionTitle("工作经历");
      for (const item of data.experience) {
        const title = `${item.company}${item.role ? ` · ${item.role}` : ""}`;
        this.drawTextLine(title, this.contentXmm, (RESUME_TOKENS.fontSize.body + 0.5) * 0.75);
        if (item.period) {
          const size = RESUME_TOKENS.fontSize.small * 0.75;
          this.page.drawText(item.period, {
            x: (this.contentXmm + this.contentWmm) * MM,
            y: mmTop(this.page, this.topMm - 4) - size * 0.35,
            size,
            font: this.font,
            color: COLOR_MUTED,
          });
        }
        this.topMm += 1;
        for (const point of item.highlights) {
          this.drawTextLine(`• ${point}`, this.contentXmm + 2, RESUME_TOKENS.fontSize.body * 0.75);
        }
        this.topMm += 1;
      }
    }

    if (data.projects.length > 0) {
      this.drawSectionTitle("项目经历");
      for (const item of data.projects) {
        this.drawTextLine(item.name, this.contentXmm, (RESUME_TOKENS.fontSize.body + 0.5) * 0.75);
        if (item.techStack?.length) {
          const size = RESUME_TOKENS.fontSize.small * 0.75;
          const tech = item.techStack.join(" / ");
          this.page.drawText(tech, {
            x: (this.contentXmm + this.contentWmm) * MM - this.font.widthOfTextAtSize(tech, size),
            y: mmTop(this.page, this.topMm - 4) - size * 0.35,
            size,
            font: this.font,
            color: COLOR_MUTED,
          });
        }
        this.topMm += 1;
        if (item.description) {
          this.drawTextLine(item.description, this.contentXmm, RESUME_TOKENS.fontSize.body * 0.75);
        }
        for (const point of item.highlights) {
          this.drawTextLine(`• ${point}`, this.contentXmm + 2, RESUME_TOKENS.fontSize.body * 0.75);
        }
        this.topMm += 1;
      }
    }

    if (data.education.length > 0) {
      this.drawSectionTitle("教育背景");
      for (const item of data.education) {
        const title = `${item.school}${item.major ? ` · ${item.major}` : ""}${item.degree ? ` · ${item.degree}` : ""}`;
        this.drawTextLine(title, this.contentXmm, (RESUME_TOKENS.fontSize.body + 0.5) * 0.75);
        if (item.period) {
          const size = RESUME_TOKENS.fontSize.small * 0.75;
          this.page.drawText(item.period, {
            x: (this.contentXmm + this.contentWmm) * MM - this.font.widthOfTextAtSize(item.period, size),
            y: mmTop(this.page, this.topMm - 4) - size * 0.35,
            size,
            font: this.font,
            color: COLOR_MUTED,
          });
        }
        this.topMm += 1;
      }
    }

    if (data.skills.length > 0) {
      this.drawSectionTitle("专业技能");
      for (const group of data.skills) {
        const line = `${group.category ? `${group.category}：` : ""}${group.items.join("、")}`;
        this.drawTextLine(line, this.contentXmm, RESUME_TOKENS.fontSize.body * 0.75);
      }
    }
  }

  /** 保存 PDF 文件 */
  async save(filename: string) {
    const bytes = await this.doc.save();
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

/** 使用 pdf-lib 嵌入 OTF 字体，导出可选中文字的中文简历 PDF */
export async function downloadResumePdf(
  data: StructuredResume,
  templateId: ResumeTemplateId,
  filenamePrefix: string,
) {
  if (!data.basics.name?.trim()) {
    throw new Error("简历数据不完整，请重新优化后再导出");
  }

  const fontBytes = await loadFontBytes();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });

  const builder = new ResumePdfBuilder(doc, font, templateId);
  builder.drawHeader(data);
  builder.drawBody(data);
  await builder.save(`${filenamePrefix}-${Date.now()}.pdf`);
}
