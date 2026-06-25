export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
};

// 发送 API 请求
export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const { timeoutMs = 60_000, signal: externalSignal, ...fetchOptions } =
    options ?? {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  const headers = new Headers(fetchOptions.headers);
  if (fetchOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const res = await fetch(path, {
      ...fetchOptions,
      credentials: "include",
      headers,
      signal: controller.signal,
    });

    let data: { error?: string } & T;
    try {
      data = (await res.json()) as typeof data;
    } catch {
      throw new ApiError(
        res.status >= 500 ? "服务器错误，请稍后重试" : "响应解析失败",
        res.status,
      );
    }

    if (!res.ok) {
      throw new ApiError(data.error ?? "请求失败", res.status);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("请求超时，请稍后重试", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
