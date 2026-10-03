import { NextResponse } from "next/server";
import { changePassword, clearSessionCookie, requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    await changePassword(user.id, body);
    const response = NextResponse.json({ ok: true, next: "密码已更新，请重新登录。" });
    response.headers.set("set-cookie", clearSessionCookie());
    return response;
  } catch (error) {
    return fail(error);
  }
}
