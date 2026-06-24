import ChatPanel from "@/app/components/ChatPanel";

// 聊天页面
export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-6">
      <ChatPanel />
    </div>
  );
}
