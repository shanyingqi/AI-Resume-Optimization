"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api/client";
import {
  clearCachedProfile,
  loadCachedProfile,
  mergeUserWithCache,
  saveCachedProfile,
} from "@/lib/auth/profile-cache";
import { migrateLocalDataToServer } from "@/lib/auth/migrate-local-data";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  onboardingCompleted?: boolean;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** 是否已从数据库加载完整用户资料（引导弹窗需等此标志为 true） */
  profileReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: {
    name?: string | null;
    avatarUrl?: string | null;
    onboardingCompleted?: boolean;
  }) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

// 认证提供者
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicAuth = isPublicAuthPath(pathname);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  function normalizeUser(data: AuthUser): AuthUser {
    return {
      ...data,
      createdAt:
        typeof data.createdAt === "string"
          ? data.createdAt
          : new Date(data.createdAt).toISOString(),
    };
  }

  const applyUser = useCallback((data: AuthUser, persist = true) => {
    const next = normalizeUser(data);
    setUser(next);
    if (persist) saveCachedProfile(next);
    return next;
  }, []);

  // 刷新用户信息（合并并发请求，避免开发模式重复调用导致误登出）
  const refresh = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const task = (async () => {
      try {
        const data = await apiFetch<{ user: AuthUser }>("/api/auth/me");
        applyUser(data.user);
        setProfileReady(true);
      } catch {
        setUser(null);
        setProfileReady(false);
        clearCachedProfile();
        try {
          await apiFetch("/api/auth/logout", { method: "POST" });
        } catch {
          // ignore
        }
      }
    })().finally(() => {
      refreshPromiseRef.current = null;
    });

    refreshPromiseRef.current = task;
    return task;
  }, [applyUser]);

  // 先用 JWT 快速恢复会话，再后台拉取完整资料
  const bootstrapSession = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/session");
      const merged = mergeUserWithCache(normalizeUser(data.user));
      setUser(merged);
      setSessionReady(true);
      const hasCachedProfile = loadCachedProfile(merged.id) !== null;
      setProfileReady(hasCachedProfile);
      void apiFetch<{ user: AuthUser }>("/api/auth/me")
        .then((full) => {
          applyUser(full.user);
          setProfileReady(true);
        })
        .catch(() => {
          // 数据库慢或不可用时保留 JWT 会话与本地缓存资料
          if (hasCachedProfile) {
            setProfileReady(true);
          }
        });
    } catch {
      setUser(null);
      setSessionReady(true);
      setProfileReady(false);
      clearCachedProfile();
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
      } catch {
        // ignore
      }
    }
  }, [applyUser]);

  // 初始化用户信息（登录/找回密码页不请求会话，避免远程数据库拖慢首屏）
  useEffect(() => {
    if (publicAuth || user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrapSession();
  }, [bootstrapSession, pathname, user, publicAuth]);

  const loading = !publicAuth && !user && !sessionReady;

  // 登录（直接使用接口返回的用户信息，避免再请求 /api/auth/me）
  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    applyUser(data.user);
    setProfileReady(true);
    void migrateLocalDataToServer();
  }, [applyUser]);

  // 注册
  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });
      applyUser(data.user);
      setProfileReady(true);
      void migrateLocalDataToServer();
    },
    [applyUser],
  );

  // 退出登录
  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setProfileReady(false);
    clearCachedProfile();
  }, []);

  // 更新用户信息
  const updateProfile = useCallback(
    async (input: {
      name?: string | null;
      avatarUrl?: string | null;
      onboardingCompleted?: boolean;
    }) => {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      applyUser(data.user);
    },
    [applyUser],
  );

  // 认证上下文值
  const value = useMemo(
    () => ({
      user,
      loading,
      profileReady,
      login,
      register,
      logout,
      updateProfile,
      refresh,
    }),
    [user, loading, profileReady, login, register, logout, updateProfile, refresh],
  );

  return (
    <AuthContext.Provider value={value}>
      <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
    </AuthContext.Provider>
  );
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
      <div className="flex min-h-screen w-full flex-1 items-center justify-center text-sm text-zinc-500">
        加载中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen w-full flex-1 items-center justify-center text-sm text-zinc-500">
        正在跳转到登录页...
      </div>
    );
  }

  return <div className="flex h-full min-h-0 w-full flex-1">{children}</div>;
}

export { ApiError };
