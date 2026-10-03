import { NextResponse } from "next/server";
import { clearSessionCookie, logout, tokenFromRequest } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function POST(request: Request) {
  try {
    await logout(tokenFromRequest(request));
    const response = NextResponse.json({ ok: true });
    response.headers.set("set-cookie", clearSessionCookie());
    return response;
  } catch (error) {
    return fail(error);
  }
}
