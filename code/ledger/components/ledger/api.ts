/** 浏览器端调用 JSON API；失败时抛出含 next 的 Error，并通知壳层。 */

type NoticeHandler = (message: string) => void;

let noticeHandler: NoticeHandler | null = null;

export function setApiNoticeHandler(handler: NoticeHandler | null) {
  noticeHandler = handler;
}

export async function apiCall<T>(
  url: string,
  body?: unknown,
  method = body ? "POST" : "GET",
): Promise<T> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    const payload = await response.json().catch(() => ({
      ok: false,
      message: `请求失败（HTTP ${response.status}）`,
      next: "稍后重试或查看服务日志。",
    }));
    if (!payload.ok) {
      const message = `${payload.message ?? "操作失败"} ${payload.next ?? ""}`.trim();
      noticeHandler?.(message);
      throw new Error(message);
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && noticeHandler) {
      // 已在上面业务失败路径通知过的，不再重复；网络错误在此补一次
      if (!error.message || error.message === "Failed to fetch") {
        noticeHandler("网络不可用或服务未启动。请确认本机 3210 服务。");
      }
    }
    throw error;
  }
}

export function yuan(cents: number) {
  return (cents / 100).toFixed(2);
}

export function hasRole(roles: string[], ...wanted: string[]) {
  return wanted.some((role) => roles.includes(role));
}
