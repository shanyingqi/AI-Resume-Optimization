type ProfileUser = {
  id: string;
  name: string | null;
  avatarUrl?: string | null;
  onboardingCompleted?: boolean;
};

const PROFILE_CACHE_KEY = "xiaodan-user-profile";

type CachedProfile = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
};

/** 读取本地缓存的用户资料 */
export function loadCachedProfile(userId: string): CachedProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedProfile;
    return data.userId === userId ? data : null;
  } catch {
    return null;
  }
}

/** 将用户资料写入本地缓存 */
export function saveCachedProfile(user: ProfileUser): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedProfile = {
      userId: user.id,
      name: user.name ?? null,
      avatarUrl: user.avatarUrl ?? null,
      onboardingCompleted: Boolean(user.onboardingCompleted),
    };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // 头像过大等场景忽略缓存失败
  }
}

/** 清除本地用户资料缓存 */
export function clearCachedProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_CACHE_KEY);
}

/** 用缓存补全会话中的用户资料 */
export function mergeUserWithCache<T extends ProfileUser>(user: T): T {
  const cached = loadCachedProfile(user.id);
  if (!cached) return user;
  return {
    ...user,
    name: cached.name,
    avatarUrl: cached.avatarUrl,
    onboardingCompleted: cached.onboardingCompleted,
  };
}
