import ChatPanel from "@/app/components/ChatPanel";

// 首页
export default function Home() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <ChatPanel />
    </div>
  );
}
