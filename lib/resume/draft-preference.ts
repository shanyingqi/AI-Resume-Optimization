const PREFIX = "xiaodan-optimize-draft-cleared";

function storageKey(userId?: string): string {
  return userId ? `${PREFIX}:${userId}` : PREFIX;
}

/** 本机是否标记为「用户已主动清空草稿」 */
export function isDraftClearedLocally(userId?: string): boolean {
  try {
    return localStorage.getItem(storageKey(userId)) === "1";
  } catch {
    return false;
  }
}

/** 记录/取消本机清空标记（API 失败时的兜底） */
export function setDraftClearedLocally(userId: string | undefined, cleared: boolean) {
  try {
    const key = storageKey(userId);
    if (cleared) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
