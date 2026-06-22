import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

/** 从 PDF 二进制数据中提取纯文本 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return normalizeText(text);
}

/** 从 DOCX 二进制数据中提取纯文本 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeText(result.value);
}

/** 统一换行符并去除多余空行 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
