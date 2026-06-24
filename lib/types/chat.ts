export interface ChatAttachment {
  id: string;
  kind: "image" | "file";
  name: string;
  mimeType: string;
  /** 图片 data URL，用于展示与发送给视觉模型 */
  dataUrl?: string;
  /** 文档解析后的文本内容 */
  textContent?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
}

export interface ChatContext {
  resume?: string;
  jobDescription?: string;
  optimizeSummary?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  context?: ChatContext;
}

export interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
}

export interface ChatRequest {
  messages: ChatMessageInput[];
  context?: ChatContext;
}
