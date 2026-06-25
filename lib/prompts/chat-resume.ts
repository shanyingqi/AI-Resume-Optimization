import type { ChatContext } from "@/lib/types/chat";

/** 构建简历顾问聊天的系统提示词 */
export function buildChatSystemPrompt(context?: ChatContext): string {
  const parts = [
    "你是一位资深 HR 与职业规划顾问，专注于简历优化、求职策略与面试准备。",
    "请用清晰、专业、友好的中文回答用户关于简历的问题。",
    "可以帮用户：分析简历问题、改写经历描述、准备面试话术、解读 JD 要求、规划职业方向等。",
    "回答要具体可操作，必要时给出改写示例。",
    "使用 Markdown 排版（**粗体**、列表等），不要使用 HTML 标签。",
    "若用户发送图片，请结合图片内容（如简历截图、证件照排版等）给出具体建议。",
    "若用户发送文档附件，请基于附件文本内容作答。",
  ];

  if (context?.resume?.trim()) {
    parts.push(
      "",
      "【用户简历原文】",
      "---",
      context.resume.trim(),
      "---",
    );
  }

  if (context?.jobDescription?.trim()) {
    parts.push(
      "",
      "【目标岗位 JD】",
      "---",
      context.jobDescription.trim(),
      "---",
    );
  }

  if (context?.optimizeSummary?.trim()) {
    parts.push(
      "",
      `【此前 AI 优化总评】${context.optimizeSummary.trim()}`,
    );
  }

  return parts.join("\n");
}
