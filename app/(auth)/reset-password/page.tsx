"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { apiFetch } from "@/lib/api/client";

// 重置密码表单
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 处理表单提交
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("重置链接无效");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      router.replace("/login");
    } catch {
      setError("重置失败，链接可能已过期");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h1 className="text-xl font-bold">设置新密码</h1>
      <input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-4 w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        placeholder="至少 6 位新密码"
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? "保存中..." : "确认重置"}
      </button>
      <Link href="/login" className="mt-4 block text-center text-sm text-zinc-500 hover:text-emerald-600">
        返回登录
      </Link>
    </form>
  );
}

// 重置密码页面
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Suspense fallback={<p className="text-sm text-zinc-500">加载中...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
