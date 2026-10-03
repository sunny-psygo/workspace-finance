import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return fail(error);
  }
}
