/** 浏览器端调用 JSON API；失败时抛出含 next 的 Error。 */
export async function apiCall<T>(
  url: string,
  body?: unknown,
  method = body ? "POST" : "GET",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(`${payload.message} ${payload.next ?? ""}`);
  return payload;
}

export function yuan(cents: number) {
  return (cents / 100).toFixed(2);
}

export function hasRole(roles: string[], ...wanted: string[]) {
  return wanted.some((role) => roles.includes(role));
}
