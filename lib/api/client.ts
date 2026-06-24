export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// 发送 API 请求
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
  });

  let data: { error?: string } & T;
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new ApiError("响应解析失败", res.status);
  }

  if (!res.ok) {
    throw new ApiError(data.error ?? "请求失败", res.status);
  }

  return data;
}
