import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { depreciateMonth } from "@/lib/fixed-asset";
import { fail } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const user = await requireUser(request, ["finance", "gm"]);
    const { bookId } = await context.params;
    const body = await request.json();
    const result = await depreciateMonth(user, bookId, {
      yearMonth: String(body?.yearMonth ?? ""),
      mutationId: String(body?.mutationId ?? ""),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return fail(error);
  }
}
