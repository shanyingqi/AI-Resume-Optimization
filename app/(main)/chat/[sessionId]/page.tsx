import ChatPanel from "@/app/components/ChatPanel";

interface ChatSessionPageProps {
  params: Promise<{ sessionId: string }>;
}

// 聊天会话页面
export default async function ChatSessionPage({ params }: ChatSessionPageProps) {
  const { sessionId } = await params;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <ChatPanel sessionId={sessionId} />
    </div>
  );
}
