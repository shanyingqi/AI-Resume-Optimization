"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api/client";
import { migrateLocalDataToServer } from "@/lib/auth/migrate-local-data";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: { name?: string | null; avatarUrl?: string | null }) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// 认证提供者
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 刷新用户信息
  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/me");
      setUser({
        ...data.user,
        createdAt:
          typeof data.user.createdAt === "string"
            ? data.user.createdAt
            : new Date(data.user.createdAt).toISOString(),
      });
    } catch {
      setUser(null);
    }
  }, []);

  // 初始化用户信息
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  // 登录
  const login = useCallback(
    async (email: string, password: string) => {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await migrateLocalDataToServer();
      await refresh();
    },
    [refresh],
  );

  // 注册
  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });
      await migrateLocalDataToServer();
      await refresh();
    },
    [refresh],
  );

  // 退出登录
  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  // 更新用户信息
  const updateProfile = useCallback(
    async (input: { name?: string | null; avatarUrl?: string | null }) => {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      setUser({
        ...data.user,
        createdAt:
          typeof data.user.createdAt === "string"
            ? data.user.createdAt
            : new Date(data.user.createdAt).toISOString(),
      });
    },
    [],
  );

  // 认证上下文值
  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile, refresh }),
    [user, loading, login, register, logout, updateProfile, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 使用认证
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth 必须在 AuthProvider 内使用");
  }
  return ctx;
}

// 保护需要登录的页面
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 如果用户未登录，则重定向到登录页面
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // 如果正在加载，则显示加载中
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        加载中...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

export { ApiError };
