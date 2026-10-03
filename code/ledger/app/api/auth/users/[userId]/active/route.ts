import { NextResponse } from "next/server";
import { requireUser, setUserActive } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    await requireUser(request, ["gm"]);
    const { userId } = await context.params;
    const body = await request.json();
    const user = await setUserActive(userId, Boolean(body?.active));
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return fail(error);
  }
}