// 响应 JSON 数据
export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// 响应错误数据
export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}
