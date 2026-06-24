"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";

function initials(nameOrEmail: string): string {
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return "单";
  const first = trimmed[0] ?? "单";
  return first.toUpperCase();
}

// 用户菜单
export default function UserMenu({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = useMemo(() => {
    if (!user) return "";
    return user.name?.trim() ? user.name.trim() : user.email;
  }, [user]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={rootRef} className="fixed right-4 top-4 z-[9999] select-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        aria-label="用户菜单"
        aria-expanded={open}
        title={displayName}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt="avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {initials(displayName)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full pt-2">
          <div className="w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-emerald-600 text-white">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold">
                    {initials(displayName)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.name?.trim() ? user.name : "未设置昵称"}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  设置
                </span>
                <span className="text-xs text-zinc-400">›</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </span>
                <span className="text-xs text-zinc-400">›</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
