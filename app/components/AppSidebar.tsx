"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import AccountSettingsModal from "@/app/components/AccountSettingsModal";
import {
  deleteChatSession,
  fetchChatSessions,
} from "@/lib/chat/sessions";
import { resetDraftChatState } from "@/lib/resume/draft-chat";
import type { ChatSession } from "@/lib/types/chat";

const SIDEBAR_COLLAPSED_KEY = "xiaodan-sidebar-collapsed";

/**
 * 简历优化图标组件：显示简历优化。
 */
function IconResume({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

/**
 * 新对话图标组件：显示新对话。
 */
function IconCompose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

/**
 * 历史图标组件：显示历史记录。
 */
function IconHistory({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconMasterResume({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconProjects({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  );
}

/**
 * 折叠图标组件：显示折叠/展开状态。
 */
function IconChevron({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg
      className={`${className} transition-transform ${open ? "" : "-rotate-90"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// 面板图标组件：显示面板。
function IconPanel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M9 3v18" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

interface NavItemProps {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed: boolean;
}

/**
 * 导航项组件：显示图标、标签、点击处理。
 */
function NavItem({ href, onClick, icon, label, active, collapsed }: NavItemProps) {
  const className = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
    active
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
  }`;

  const content = (
    <>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} title={collapsed ? label : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} title={collapsed ? label : undefined}>
      {content}
    </button>
  );
}

/**
 * 应用侧边栏组件：显示对话列表、简历优化入口、折叠控制。
 */
export default function AppSidebar({
  externalSettingsOpen,
  onExternalSettingsOpenChange,
}: {
  externalSettingsOpen?: boolean;
  onExternalSettingsOpenChange?: (open: boolean) => void;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false);

  // 刷新对话列表
  const refreshSessions = useCallback(() => {
    void fetchChatSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "true") setCollapsed(true);
    } catch {
      // ignore
    }
    refreshSessions();

    window.addEventListener("xiaodan-sessions-updated", refreshSessions);
    return () => window.removeEventListener("xiaodan-sessions-updated", refreshSessions);
  }, [refreshSessions]);

  // 折叠侧边栏
  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  // 新对话
  function handleNewChat() {
    resetDraftChatState();
    router.push("/");
  }

  // 删除对话
  function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    void deleteChatSession(id).then(() => {
      refreshSessions();
      if (pathname === `/chat/${id}`) {
        router.push("/");
      }
    });
  }

  const activeSessionId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2]
    : undefined;

  const settingsOpen = externalSettingsOpen ?? internalSettingsOpen;
  const setSettingsOpen = onExternalSettingsOpenChange ?? setInternalSettingsOpen;

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950 ${
        collapsed ? "w-[60px]" : "w-[240px]"
      }`}
    >
      <div className={`flex shrink-0 items-center ${collapsed ? "flex-col gap-2 px-2 py-3" : "h-14 justify-between px-4"}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={handleNewChat}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white transition ${
              pathname === "/"
                ? "bg-emerald-700 ring-2 ring-emerald-300 dark:ring-emerald-800"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
            title="新对话"
          >
            单
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-2.5 rounded-lg transition hover:opacity-90"
            title="新对话"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              单
            </span>
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              小单 AI
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          <IconPanel className="h-4 w-4" />
        </button>
      </div>

      <nav className="space-y-1 px-2">
        <NavItem
          onClick={handleNewChat}
          icon={<IconCompose className="h-5 w-5" />}
          label="新对话"
          active={pathname === "/"}
          collapsed={collapsed}
        />
        <NavItem
          href="/resume"
          icon={<IconResume className="h-5 w-5" />}
          label="简历优化"
          active={pathname === "/resume"}
          collapsed={collapsed}
        />
        <NavItem
          href="/master-resume"
          icon={<IconMasterResume className="h-5 w-5" />}
          label="主简历"
          active={pathname === "/master-resume"}
          collapsed={collapsed}
        />
        <NavItem
          href="/projects"
          icon={<IconProjects className="h-5 w-5" />}
          label="求职项目"
          active={pathname.startsWith("/projects")}
          collapsed={collapsed}
        />
      </nav>

      {!collapsed && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col px-2">
          <button
            type="button"
            onClick={() => setSessionsExpanded((v) => !v)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <IconChevron className="h-3.5 w-3.5" open={sessionsExpanded} />
            所有对话
          </button>

          {sessionsExpanded && (
            <ul className="mt-1 flex-1 space-y-0.5 overflow-y-auto pb-4">
              {sessions.length === 0 ? (
                <li className="px-3 py-2 text-xs text-zinc-400">暂无对话</li>
              ) : (
                sessions.map((session) => {
                  const active = activeSessionId === session.id;
                  return (
                    <li key={session.id}>
                      <Link
                        href={`/chat/${session.id}`}
                        className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <IconHistory className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="min-w-0 flex-1 truncate">
                          {session.context?.projectTitle || session.title}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="shrink-0 rounded px-1 text-xs text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                          title="删除"
                        >
                          ×
                        </button>
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      )}

      {!collapsed && user && (
        <div className="shrink-0 border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              title="设置"
            >
              <IconSettings className="h-3.5 w-3.5" />
              设置
            </button>
          </div>
        </div>
      )}

      <AccountSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </aside>
  );
}
