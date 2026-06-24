"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, useAuth } from "@/app/components/AuthProvider";

const MAX_AVATAR_BYTES = 1024 * 1024; // 1MB

// 读取文件为 Data URL
async function readAsDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return `data:${file.type};base64,${btoa(binary)}`;
}

// 账号设置弹窗
export default function AccountSettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const email = user?.email ?? "";

  // 打开弹窗时设置用户名和头像
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(user?.name ?? "");
    setAvatarUrl(user?.avatarUrl ?? null);
    setError("");
    setSaving(false);
  }, [open, user?.name, user?.avatarUrl]);

  // 按下 Esc 键时关闭弹窗
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // 判断是否为脏数据
  const dirty = useMemo(() => {
    const current = (user?.name ?? "").trim();
    const currentAvatar = user?.avatarUrl ?? null;
    return name.trim() !== current || avatarUrl !== currentAvatar;
  }, [name, avatarUrl, user?.name, user?.avatarUrl]);

  // 保存用户名和头像
  async function handleSave() {
    if (!user) return;
    setError("");
    setSaving(true);
    try {
      const nextName = name.trim();
      await updateProfile({
        name: nextName ? nextName : null,
        avatarUrl,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  // 退出登录
  async function handleLogout() {
    await logout();
    onClose();
    location.href = "/login";
  }

  // 如果弹窗未打开，则返回 null
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            账号
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            aria-label="关闭"
            title="关闭"
          >
            ×
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="relative h-20 w-20 overflow-hidden rounded-3xl bg-emerald-600 text-white">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold">
                  {user?.name?.trim()?.[0]?.toUpperCase() ?? "单"}
                </div>
              )}
              <label className="absolute inset-x-2 bottom-2 cursor-pointer rounded-xl bg-black/45 px-2 py-1 text-center text-xs text-white backdrop-blur hover:bg-black/55">
                更换头像
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setError("");
                    if (file.size > MAX_AVATAR_BYTES) {
                      setError("头像过大，请选择 1MB 以内的图片");
                      return;
                    }
                    if (!file.type.startsWith("image/")) {
                      setError("请选择图片文件");
                      return;
                    }
                    try {
                      const dataUrl = await readAsDataUrl(file);
                      setAvatarUrl(dataUrl);
                    } catch {
                      setError("读取头像失败，请重试");
                    }
                  }}
                />
              </label>
            </div>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="text-xs text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                移除头像
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              退出登录
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                用户名
              </label>
              <div className="flex gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950/40"
                  placeholder="输入用户名"
                  maxLength={50}
                />
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={() => void handleSave()}
                  className="shrink-0 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "保存中..." : "确认"}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                邮箱
              </label>
              <input
                value={email}
                readOnly
                className="w-full cursor-not-allowed rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400"
              />
            </div>

            {error && (
              <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}

            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              当前仅支持修改用户名；邮箱暂不支持更改。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

