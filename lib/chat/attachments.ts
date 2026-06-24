import {
  ACCEPTED_CHAT_FILE_EXTENSIONS,
  ACCEPTED_CHAT_IMAGE_TYPES,
  MAX_CHAT_ATTACHMENTS,
  MAX_CHAT_IMAGE_SIZE,
  MAX_CHAT_MESSAGE_CHARS,
  MAX_RESUME_CHARS,
  MAX_RESUME_FILE_SIZE,
} from "@/lib/resume/constants";
import type { ChatAttachment, ChatMessage, ChatMessageInput } from "@/lib/types/chat";

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/** 读取图片为附件 */
export function readImageAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_CHAT_IMAGE_TYPES.includes(file.type)) {
      reject(new Error("仅支持 JPG、PNG、GIF、WEBP 图片"));
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_SIZE) {
      reject(new Error(`单张图片不能超过 ${MAX_CHAT_IMAGE_SIZE / 1024 / 1024}MB`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: crypto.randomUUID(),
        kind: "image",
        name: file.name,
        mimeType: file.type,
        dataUrl: reader.result as string,
      });
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

/** 读取文档附件（TXT/MD 本地读取，PDF/DOCX 调解析接口） */
export async function readFileAttachment(file: File): Promise<ChatAttachment> {
  const ext = getExtension(file.name);

  if (!ACCEPTED_CHAT_FILE_EXTENSIONS.includes(ext)) {
    throw new Error("附件支持 PDF、DOCX、TXT、MD 格式");
  }
  if (file.size > MAX_RESUME_FILE_SIZE) {
    throw new Error("附件大小不能超过 5MB");
  }

  if (ext === ".txt" || ext === ".md") {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error("文件内容为空");
    }
    return {
      id: crypto.randomUUID(),
      kind: "file",
      name: file.name,
      mimeType: file.type || "text/plain",
      textContent: text,
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/parse-resume", {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "文件解析失败");
  }
  if (!data.text?.trim()) {
    throw new Error("未能从文件中提取到文字");
  }

  return {
    id: crypto.randomUUID(),
    kind: "file",
    name: file.name,
    mimeType: file.type,
    textContent: data.text,
  };
}

/** 合并新附件，校验数量上限 */
export function mergeAttachments(
  current: ChatAttachment[],
  incoming: ChatAttachment[],
): ChatAttachment[] {
  const merged = [...current, ...incoming];
  if (merged.length > MAX_CHAT_ATTACHMENTS) {
    throw new Error(`每条消息最多 ${MAX_CHAT_ATTACHMENTS} 个附件`);
  }
  return merged;
}

/** 根据附件生成默认发送文案 */
export function defaultMessageWithAttachments(
  text: string,
  attachments: ChatAttachment[],
): string {
  const trimmed = text.trim();
  if (trimmed) return trimmed;

  const hasImage = attachments.some((a) => a.kind === "image");
  const hasFile = attachments.some((a) => a.kind === "file");
  if (hasImage && hasFile) return "请查看我发送的图片和附件";
  if (hasImage) return "请查看我发送的图片";
  if (hasFile) return "请查看我发送的附件";
  return "";
}

/** 根据附件估算发给 API 的消息总字数 */
export function estimateMessagePayloadLength(
  content: string,
  attachments?: ChatAttachment[],
): number {
  let len = content.trim().length;
  for (const att of attachments ?? []) {
    if (att.textContent) len += att.textContent.length;
  }
  return len;
}

/** 带简历附件时允许更长内容 */
export function maxMessagePayloadLength(attachments?: ChatAttachment[]): number {
  const hasFile = attachments?.some((a) => a.kind === "file" && a.textContent);
  return hasFile ? MAX_RESUME_CHARS : MAX_CHAT_MESSAGE_CHARS;
}

/** 构建发给大模型的 user/assistant 消息体 */
export function buildApiMessageContent(
  content: string,
  attachments?: ChatAttachment[],
): string | Array<{ type: string; text?: string; image_url?: { url: string } }> {
  const images = attachments?.filter((a) => a.kind === "image" && a.dataUrl) ?? [];
  const files = attachments?.filter((a) => a.kind === "file") ?? [];

  let text = content.trim();
  for (const file of files) {
    text += `\n\n【附件：${file.name}】\n${file.textContent?.trim() || "(无法读取内容)"}`;
  }

  if (images.length === 0) {
    return text;
  }

  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  if (text) {
    parts.push({ type: "text", text });
  }
  for (const image of images) {
    parts.push({ type: "image_url", image_url: { url: image.dataUrl! } });
  }
  return parts;
}

/** 将消息转为 API 请求格式（文档正文合并进 content，图片保留多模态） */
export function flattenMessageForApi(message: ChatMessage): ChatMessageInput {
  const built = buildApiMessageContent(message.content, message.attachments);
  if (typeof built === "string") {
    return { role: message.role, content: built };
  }
  return {
    role: message.role,
    content: message.content,
    attachments: message.attachments?.filter((a) => a.kind === "image"),
  };
}

/** 发送前校验附件是否已解析出正文 */
export function validateAttachmentsReady(attachments?: ChatAttachment[]): string | null {
  for (const att of attachments ?? []) {
    if (att.kind === "file" && !att.textContent?.trim()) {
      return `附件「${att.name}」未能解析出文字，请重新上传或换一份 PDF/Word`;
    }
  }
  return null;
}
