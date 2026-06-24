import ChatPanel from "@/app/components/ChatPanel";

interface ChatSessionPageProps {
  params: Promise<{ sessionId: string }>;
}

// 聊天会话页面
export default async function ChatSessionPage({ params }: ChatSessionPageProps) {
  const { sessionId } = await params;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-6">
      <ChatPanel sessionId={sessionId} />
    </div>
  );
}
