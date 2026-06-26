/** 文本与图片内容合规校验 */

import { moderateWithProvider } from "@/lib/content/moderation-api";

const USERNAME_RE = /^[\u4e00-\u9fa5a-zA-Z0-9_·\-\s]{2,50}$/;

/** 敏感词（中英文常见违规词，子串匹配） */
const BANNED_TERMS = [
  "fuck",
  "shit",
  "bitch",
  "porn",
  "nigger",
  "操你",
  "傻逼",
  "傻b",
  "sb",
  "草泥马",
  "妈的",
  "他妈",
  "去死",
  "杀了你",
  "色情",
  "裸体",
  "赌博",
  "毒品",
  "法轮功",
  "习近平",
  "共产党",
  "台独",
  "藏独",
  "疆独",
];

const IMAGE_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

// 规范化文本用于敏感词扫描
function normalizeForScan(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s_\-·.]+/g, "")
    .replace(/[０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    );
}

/** 检测文本是否含敏感内容 */
export function moderateText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const normalized = normalizeForScan(trimmed);
  for (const term of BANNED_TERMS) {
    if (normalized.includes(normalizeForScan(term))) {
      return "内容包含违规信息，请修改后重试";
    }
  }
  return null;
}

/** 本地敏感词 + 可选第三方 API 文本审核（服务端使用） */
export async function moderateTextAsync(text: string): Promise<string | null> {
  const local = moderateText(text);
  if (local) return local;
  return moderateWithProvider(text);
}

/** 校验用户名/昵称 */
export function validateUsername(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  if (trimmed.length < 2) return "用户名至少 2 个字符";
  if (trimmed.length > 50) return "用户名不能超过 50 个字符";
  if (!USERNAME_RE.test(trimmed)) {
    return "用户名仅支持中文、英文、数字、空格及 _ · -";
  }

  return moderateText(trimmed);
}

/** 服务端：用户名校验 + 可选第三方审核 */
export async function validateUsernameAsync(
  name: string,
): Promise<string | null> {
  const local = validateUsername(name);
  if (local) return local;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return moderateWithProvider(trimmed);
}

/** 从 Data URL 解析 base64 二进制 */
function decodeDataUrl(dataUrl: string): {
  mime: string;
  buffer: Buffer;
} | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!match) return null;

  try {
    const buffer = Buffer.from(match[2]!, "base64");
    return { mime: match[1]!.toLowerCase(), buffer };
  } catch {
    return null;
  }
}

// 检测图片格式
function detectImageMime(buffer: Buffer): string | null {
  for (const sig of IMAGE_SIGNATURES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) {
      if (sig.mime === "image/webp") {
        const tag = buffer.subarray(8, 12).toString("ascii");
        if (tag !== "WEBP") continue;
      }
      return sig.mime;
    }
  }
  return null;
}

/** 校验头像或聊天图片 Data URL */
export function validateImageDataUrl(
  dataUrl: string,
  maxBytes: number,
): string | null {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return "图片格式无效";

  if (!decoded.mime.startsWith("image/")) {
    return "仅支持图片文件";
  }

  if (decoded.buffer.length > maxBytes) {
    return `图片过大，请控制在 ${Math.round(maxBytes / 1024 / 1024)}MB 以内`;
  }

  const detected = detectImageMime(decoded.buffer);
  if (!detected) return "图片格式无效或文件已损坏";

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(detected)) {
    return "仅支持 JPG、PNG、GIF、WEBP 图片";
  }

  return null;
}

/** 校验聊天附件中的图片与文档正文 */
export function moderateAttachments(
  attachments?: Array<{
    kind: string;
    name?: string;
    dataUrl?: string;
    textContent?: string;
  }>,
): string | null {
  if (!attachments?.length) return null;

  for (const att of attachments) {
    if (att.name) {
      const nameError = moderateText(att.name);
      if (nameError) return "附件名称包含违规信息";
    }

    if (att.kind === "image" && att.dataUrl) {
      const imageError = validateImageDataUrl(att.dataUrl, 2 * 1024 * 1024);
      if (imageError) return imageError;
    }

    if (att.textContent?.trim()) {
      const textError = moderateText(att.textContent);
      if (textError) return "附件内容包含违规信息，请更换文件";
    }
  }

  return null;
}

/** 服务端：附件校验 + 可选第三方文本审核 */
export async function moderateAttachmentsAsync(
  attachments?: Array<{
    kind: string;
    name?: string;
    dataUrl?: string;
    textContent?: string;
  }>,
): Promise<string | null> {
  const local = moderateAttachments(attachments);
  if (local) return local;
  if (!attachments?.length) return null;

  for (const att of attachments) {
    if (att.name) {
      const nameError = await moderateWithProvider(att.name);
      if (nameError) return "附件名称包含违规信息";
    }
    if (att.textContent?.trim()) {
      const textError = await moderateWithProvider(att.textContent);
      if (textError) return "附件内容包含违规信息，请更换文件";
    }
  }

  return null;
}
