"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { validateEmail } from "@/lib/auth/email";
import { ApiError, apiFetch } from "@/lib/api/client";

// 找回密码页面
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      router.replace(`/login?reset=1&message=${encodeURIComponent(data.message)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "重置失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="text-xl font-bold">找回密码</h1>
        <p className="mt-2 text-sm text-zinc-500">
          输入注册邮箱并设置新密码
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              新密码
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 pr-12 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="至少 6 位"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              重新输入新密码
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="再次输入新密码"
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "提交中..." : "重置密码"}
        </button>

        <Link
          href="/login"
          className="mt-4 block text-center text-sm text-zinc-500 hover:text-emerald-600"
        >
          返回登录
        </Link>
      </form>
    </div>
  );
}
