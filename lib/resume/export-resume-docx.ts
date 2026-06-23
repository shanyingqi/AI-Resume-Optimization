import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ResumeTemplateId, StructuredResume } from "@/lib/types/resume";
import { formatContactLine } from "@/lib/resume/structured-resume";

/** 构建标题段落 */
function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true })],
  });
}

/** 构建正文段落 */
function body(text: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun(text)],
  });
}

/** 构建列表段落 */
function bullet(text: string) {
  return new Paragraph({
    spacing: { after: 60 },
    bullet: { level: 0 },
    children: [new TextRun(text)],
  });
}

/** 构建简约风格简历 */
function buildClassicDoc(data: StructuredResume): Paragraph[] {
  const contact = formatContactLine(data.basics);
  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: data.basics.name, bold: true, size: 36 }),
      ],
    }),
  ];

  if (data.basics.title) {
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: data.basics.title, color: "666666" })],
      }),
    );
  }
  if (contact) {
    children.push(body(contact));
  }

  if (data.summary) {
    children.push(heading("个人总结", HeadingLevel.HEADING_2));
    children.push(body(data.summary));
  }

  if (data.experience.length > 0) {
    children.push(heading("工作经历", HeadingLevel.HEADING_2));
    for (const item of data.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({
              text: `${item.company}${item.role ? ` · ${item.role}` : ""}`,
              bold: true,
            }),
            ...(item.period
              ? [new TextRun({ text: `    ${item.period}`, color: "888888" })]
              : []),
          ],
        }),
      );
      item.highlights.forEach((point) => children.push(bullet(point)));
    }
  }

  if (data.projects.length > 0) {
    children.push(heading("项目经历", HeadingLevel.HEADING_2));
    for (const item of data.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: item.name, bold: true }),
            ...(item.techStack?.length
              ? [new TextRun({ text: `    ${item.techStack.join(" / ")}`, color: "888888" })]
              : []),
          ],
        }),
      );
      if (item.description) children.push(body(item.description));
      item.highlights.forEach((point) => children.push(bullet(point)));
    }
  }

  if (data.education.length > 0) {
    children.push(heading("教育背景", HeadingLevel.HEADING_2));
    for (const item of data.education) {
      const title = `${item.school}${item.major ? ` · ${item.major}` : ""}${item.degree ? ` · ${item.degree}` : ""}`;
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: title, bold: true }),
            ...(item.period
              ? [new TextRun({ text: `    ${item.period}`, color: "888888" })]
              : []),
          ],
        }),
      );
    }
  }

  if (data.skills.length > 0) {
    children.push(heading("专业技能", HeadingLevel.HEADING_2));
    for (const group of data.skills) {
      children.push(
        body(`${group.category ? `${group.category}：` : ""}${group.items.join("、")}`),
      );
    }
  }

  return children;
}

/** 构建现代风格简历 */
function buildModernDoc(data: StructuredResume): Paragraph[] {
  const contact = formatContactLine(data.basics);
  const header: Paragraph[] = [
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: data.basics.name, bold: true, size: 36, color: "059669" }),
      ],
    }),
  ];
  if (data.basics.title) {
    header.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: data.basics.title, color: "666666" })],
      }),
    );
  }
  if (contact) header.push(body(contact));

  const rest = buildClassicDoc(data).slice(
    1 + (data.basics.title ? 1 : 0) + (contact ? 1 : 0),
  );
  return [...header, ...rest];
}

/** 构建侧栏风格简历 */
function buildSidebarDoc(data: StructuredResume): Paragraph[] {
  return buildClassicDoc(data);
}

/** 下载 Blob 文件 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 导出 Word 文档 */
export async function downloadResumeDocx(
  data: StructuredResume,
  templateId: ResumeTemplateId,
  filenamePrefix: string,
) {
  if (!data.basics.name?.trim()) {
    throw new Error("简历数据不完整，请重新优化后再导出");
  }

  const builders: Record<ResumeTemplateId, (d: StructuredResume) => Paragraph[]> = {
    classic: buildClassicDoc,
    modern: buildModernDoc,
    sidebar: buildSidebarDoc,
  };

  const doc = new Document({
    sections: [{ children: builders[templateId](data) }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filenamePrefix}-${Date.now()}.docx`);
}
