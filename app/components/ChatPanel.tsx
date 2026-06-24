"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  defaultMessageWithAttachments,
  estimateMessagePayloadLength,
  flattenMessageForApi,
  maxMessagePayloadLength,
  mergeAttachments,
  readFileAttachment,
  readImageAttachment,
  validateAttachmentsReady,
} from "@/lib/chat/attachments";
import { consumeChatStream } from "@/lib/chat/chat-stream";
import {
  appendChatMessage,
  createDraftSession,
  getChatSession,
  previewChatTitle,
  saveChatSession,
  updateLastAssistantMessage,
} from "@/lib/chat/sessions";
import { DRAFT_CHAT_CONTEXT_KEY } from "@/lib/resume/constants";
import type { ChatAttachment, ChatContext, ChatMessage, ChatSession } from "@/lib/types/chat";

interface ChatPanelProps {
  sessionId?: string;
}

// 创建消息
function createMessage(
  role: ChatMessage["role"],
  content: string,
  attachments?: ChatAttachment[],
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    attachments: attachments?.length ? attachments : undefined,
  };
}

function MessageBody({
  msg,
  loading,
}: {
  msg: ChatMessage;
  loading?: boolean;
}) {
  const isUser = msg.role === "user";

  return (
    <div className={`space-y-2 ${isUser ? "text-white" : ""}`}>
      {msg.attachments && msg.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {msg.attachments.map((att) =>
            att.kind === "image" && att.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={att.id}
                src={att.dataUrl}
                alt={att.name}
                className="max-h-40 max-w-full rounded-lg object-cover"
              />
            ) : (
              <span
                key={att.id}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
                  isUser
                    ? "bg-emerald-700/60"
                    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                }`}
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21.44 11.05-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
                {att.name}
              </span>
            ),
          )}
        </div>
      )}
      {msg.content ? (
        <p className="whitespace-pre-wrap">{msg.content}</p>
      ) : loading && msg.role === "assistant" ? (
        <span className="inline-flex items-center gap-1 text-zinc-400">
          <span className="animate-pulse">思考中</span>
          <span className="animate-bounce">...</span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * 读取草稿上下文：从 sessionStorage 中获取草稿上下文。
 */
function readDraftContext(): ChatContext | undefined {
  try {
    const raw = sessionStorage.getItem(DRAFT_CHAT_CONTEXT_KEY);
    if (!raw) return undefined;
    sessionStorage.removeItem(DRAFT_CHAT_CONTEXT_KEY);
    return JSON.parse(raw) as ChatContext;
  } catch {
    return undefined;
  }
}

// 聊天面板组件：显示聊天内容、输入框、错误提示。
export default function ChatPanel({ sessionId }: ChatPanelProps) {
  const router = useRouter();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftContextRef = useRef<ChatContext | undefined>(undefined);
  const activeSessionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // 仅在切换到其他已有会话时中断请求，避免无意义 abort
    if (
      activeSessionRef.current !== undefined &&
      activeSessionRef.current !== sessionId
    ) {
      abortRef.current?.abort();
      abortRef.current = null;
    }
    activeSessionRef.current = sessionId;

    if (sessionId) {
      const loaded = getChatSession(sessionId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(loaded);
      setPersisted(Boolean(loaded));
    } else {
      const context = readDraftContext();
      draftContextRef.current = context;
      setSession(createDraftSession(context));
      setPersisted(false);
    }

    setInput("");
    setPendingAttachments([]);
    setError("");
    setStreamingContent("");
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (session?.messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [session?.messages, streamingContent]);

  // 发送消息
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();

    const text = defaultMessageWithAttachments(input, pendingAttachments);
    if (!text || loading || !session) return;

    const attachments = pendingAttachments.length ? [...pendingAttachments] : undefined;
    const attachmentError = validateAttachmentsReady(attachments);
    if (attachmentError) {
      setError(attachmentError);
      return;
    }

    const maxLen = maxMessagePayloadLength(attachments);
    const payloadLen = estimateMessagePayloadLength(text, attachments);
    if (payloadLen > maxLen) {
      setError(`消息内容过长，不能超过 ${maxLen.toLocaleString()} 字`);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMessage = createMessage("user", text, attachments);
    const assistantPlaceholder = createMessage("assistant", "");
    const isFirstPersist = !persisted;

    let workingSession: ChatSession;

    if (isFirstPersist) {
      workingSession = {
        ...session,
        title: previewChatTitle(text),
        messages: [userMessage, assistantPlaceholder],
      };
      saveChatSession(workingSession);
      setPersisted(true);
    } else {
      const withUser =
        appendChatMessage(session.id, userMessage) ??
        ({ ...session, messages: [...session.messages, userMessage] } as ChatSession);
      workingSession = {
        ...withUser,
        messages: [...withUser.messages, assistantPlaceholder],
      };
      saveChatSession(workingSession);
    }

    setSession(workingSession);
    setInput("");
    setPendingAttachments([]);
    setError("");
    setLoading(true);
    setStreamingContent("");

    const apiMessages = workingSession.messages
      .slice(0, -1)
      .map(flattenMessageForApi);

    const savedSessionId = workingSession.id;

    try {
      const reply = await consumeChatStream(
        { messages: apiMessages, context: workingSession.context },
        (partial) => {
          setStreamingContent(partial);
          updateLastAssistantMessage(savedSessionId, partial);
        },
        controller.signal,
      );

      const finalSession = updateLastAssistantMessage(savedSessionId, reply);
      if (finalSession) setSession(finalSession);
      setStreamingContent("");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const aborted = getChatSession(savedSessionId);
        if (aborted) {
          const trimmed = {
            ...aborted,
            messages: aborted.messages.filter(
              (m) => m.id !== assistantPlaceholder.id,
            ),
          };
          if (trimmed.messages.length === 0) {
            setSession(createDraftSession(draftContextRef.current));
            setPersisted(false);
            if (!sessionId) router.replace("/chat");
          } else {
            saveChatSession(trimmed);
            setSession(trimmed);
          }
        }
        return;
      }

      const failed = getChatSession(savedSessionId);
      if (failed) {
        const trimmed = {
          ...failed,
          messages: failed.messages.filter((m) => m.id !== assistantPlaceholder.id),
        };
        if (trimmed.messages.length === 0) {
          setSession(createDraftSession(draftContextRef.current));
          setPersisted(false);
          router.replace("/chat");
        } else {
          saveChatSession(trimmed);
          setSession(trimmed);
        }
      }

      setError(err instanceof Error ? err.message : "发送失败");
      setStreamingContent("");
    } finally {
      setLoading(false);
      abortRef.current = null;
      textareaRef.current?.focus();
      // 首条消息发送完成后再切换路由，避免 /chat → /chat/[id] 卸载组件中断流式请求
      if (isFirstPersist && !sessionId) {
        router.replace(`/chat/${savedSessionId}`);
      }
    }
  }

  // 取消发送
  function handleCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setStreamingContent("");
  }

  // 按下回车键
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    setError("");
    setAttaching(true);
    try {
      const incoming: ChatAttachment[] = [];
      for (const file of files) {
        incoming.push(await readImageAttachment(file));
      }
      setPendingAttachments((prev) => mergeAttachments(prev, incoming));
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片添加失败");
    } finally {
      setAttaching(false);
    }
  }

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    setError("");
    setAttaching(true);
    try {
      const incoming: ChatAttachment[] = [];
      for (const file of files) {
        incoming.push(await readFileAttachment(file));
      }
      setPendingAttachments((prev) => mergeAttachments(prev, incoming));
    } catch (err) {
      setError(err instanceof Error ? err.message : "附件添加失败");
    } finally {
      setAttaching(false);
    }
  }

  function removePendingAttachment(id: string) {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  const canSend = Boolean(input.trim() || pendingAttachments.length) && !loading && !attaching;

  // 没有会话时显示空状态
  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        会话不存在或已被删除
      </div>
    );
  }

  const hasContext = Boolean(session.context?.resume?.trim());
  const displayMessages = session.messages.map((msg) => {
    if (
      loading &&
      streamingContent &&
      msg.role === "assistant" &&
      msg.id === session.messages[session.messages.length - 1]?.id
    ) {
      return { ...msg, content: streamingContent };
    }
    return msg;
  });

  const suggestions = hasContext
    ? [
        "我的简历有哪些需要改进的地方？",
        "帮我改写一段工作经历，突出量化成果",
        "针对目标岗位，我还缺哪些关键技能？",
      ]
    : [
        "应届生简历应该怎么写？",
        "如何用 STAR 法则描述项目经历？",
        "简历上应该放哪些关键词才能通过 ATS？",
      ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {hasContext && (
        <div className="shrink-0 border-b border-zinc-100 px-4 py-2 text-xs text-emerald-700 dark:border-zinc-800 dark:text-emerald-300">
          已关联简历内容，可直接针对你的简历提问
          {session.context?.jobDescription?.trim() && "（含目标 JD）"}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {displayMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
            <p className="text-lg font-medium">简历顾问 AI</p>
            <p className="max-w-md text-sm text-zinc-500">
              可以问我简历改写、JD 匹配、面试准备、职业规划等问题
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  <MessageBody
                    msg={msg}
                    loading={loading && msg.role === "assistant" && !msg.content}
                  />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && (
        <p className="shrink-0 px-4 pb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={handleSend} className="shrink-0 p-4 sm:px-5 sm:pb-5">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={handleImagePick}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          multiple
          className="hidden"
          onChange={handleFilePick}
        />
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow focus-within:shadow-md dark:border-zinc-700 dark:bg-zinc-800/80 dark:shadow-none dark:focus-within:border-zinc-600">
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-zinc-100 px-4 pt-3 pb-2 dark:border-zinc-700">
              {pendingAttachments.map((att) => (
                <div key={att.id} className="group relative">
                  {att.kind === "image" && att.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 max-w-[140px] items-center gap-1.5 rounded-lg bg-zinc-100 px-2 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21.44 11.05-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                      <span className="truncate">{att.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePendingAttachment(att.id)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-white opacity-90 hover:bg-red-600"
                    title="移除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || attaching}
            rows={2}
            placeholder="提问任何简历相关问题"
            className="block w-full resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed outline-none placeholder:text-zinc-400 disabled:opacity-60"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                tabIndex={-1}
                disabled={loading || attaching}
                onClick={() => imageInputRef.current?.click()}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                title="添加图片"
                aria-label="添加图片"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                tabIndex={-1}
                disabled={loading || attaching}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                title="添加附件"
                aria-label="添加附件"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21.44 11.05-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              {attaching && (
                <span className="text-xs text-zinc-400">处理中...</span>
              )}
            </div>

            {loading ? (
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 transition hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-500"
                title="停止"
                aria-label="停止生成"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-300 text-white transition enabled:bg-emerald-600 enabled:hover:bg-emerald-700 disabled:cursor-not-allowed dark:enabled:bg-emerald-600 dark:disabled:bg-zinc-600"
                title="发送"
                aria-label="发送"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0-7 7m7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 px-1 text-xs text-zinc-400">
          AI 回复仅供参考，重要决策请结合自身情况判断
        </p>
      </form>
    </div>
  );
}
