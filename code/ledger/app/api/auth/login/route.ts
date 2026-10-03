import { NextResponse } from "next/server";
import { login, sessionCookie } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await login(body);
    const response = NextResponse.json({
      ok: true,
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
      user: result.user,
    });
    response.headers.set("set-cookie", sessionCookie(result.token, result.expiresAt));
    return response;
  } catch (error) {
    return fail(error);
  }
}
