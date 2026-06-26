import {
  moderateAttachments,
  moderateAttachmentsAsync,
  moderateText,
  moderateTextAsync,
} from "@/lib/content/moderation";
import {
  MAX_CHAT_MESSAGE_CHARS,
  MAX_CHAT_MESSAGES,
  MAX_RESUME_CHARS,
} from "@/lib/resume/constants";
import {
  validateJobDescriptionLength,
  validateResumeLength,
} from "@/lib/resume/validate";
import type { ChatContext, ChatMessageInput } from "@/lib/types/chat";

// 计算消息文本长度
function messageTextLength(msg: ChatMessageInput): number {
  let len = msg.content.trim().length;
  for (const att of msg.attachments ?? []) {
    if (att.textContent) len += att.textContent.length;
  }
  return len;
}

// 计算单条消息最大长度
function maxLenForMessage(msg: ChatMessageInput): number {
  const hasFile =
    msg.content.includes("【附件：") ||
    msg.attachments?.some((a) => a.kind === "file" && a.textContent);
  return hasFile ? MAX_RESUME_CHARS : MAX_CHAT_MESSAGE_CHARS;
}

/** 校验聊天请求 */
export function validateChatInput(
  messages: ChatMessageInput[],
  context?: ChatContext,
): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "请提供消息内容";
  }

  if (messages.length > MAX_CHAT_MESSAGES) {
    return `对话消息过多，最多 ${MAX_CHAT_MESSAGES} 条`;
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return "最后一条消息须为用户消息";
  }

  for (const msg of messages) {
    const hasAttachments = (msg.attachments?.length ?? 0) > 0;
    const hasFileInContent = msg.content.includes("【附件：");
    const len = hasFileInContent ? msg.content.length : messageTextLength(msg);
    if (len === 0 && !hasAttachments) return "消息内容不能为空";
    const maxLen = maxLenForMessage(msg);
    if (len > maxLen) {
      return `单条消息不能超过 ${maxLen.toLocaleString()} 字`;
    }
    const contentError = moderateText(msg.content);
    if (contentError) return contentError;
    const attachmentError = moderateAttachments(msg.attachments);
    if (attachmentError) return attachmentError;
    if (msg.role !== "user" && msg.role !== "assistant") {
      return "消息角色无效";
    }
  }

  if (context?.resume) {
    const resumeError = validateResumeLength(context.resume);
    if (resumeError) return resumeError;
  }

  if (context?.jobDescription) {
    const jdError = validateJobDescriptionLength(context.jobDescription);
    if (jdError) return jdError;
  }

  return null;
}

/** 服务端：聊天请求校验 + 可选第三方内容审核 */
export async function validateChatInputAsync(
  messages: ChatMessageInput[],
  context?: ChatContext,
): Promise<string | null> {
  const syncError = validateChatInput(messages, context);
  if (syncError) return syncError;

  for (const msg of messages) {
    const contentError = await moderateTextAsync(msg.content);
    if (contentError) return contentError;
    const attachmentError = await moderateAttachmentsAsync(msg.attachments);
    if (attachmentError) return attachmentError;
  }

  if (context?.resume) {
    const resumeError = await moderateTextAsync(context.resume);
    if (resumeError) return resumeError;
  }

  if (context?.jobDescription) {
    const jdError = await moderateTextAsync(context.jobDescription);
    if (jdError) return jdError;
  }

  return null;
}
