import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { reopenPeriod } from "@/lib/ledger";

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request, ["finance", "gm"]);
    const { bookId } = await context.params;
    const body = await request.json();
    await reopenPeriod(bookId, String(body?.yearMonth ?? ""), String(body?.remark ?? ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}