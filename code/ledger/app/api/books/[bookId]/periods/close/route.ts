import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { closePeriod } from "@/lib/ledger";

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const user = await requireUser(request, ["finance", "gm"]);
    const { bookId } = await context.params;
    const body = await request.json();
    const period = await closePeriod(
      bookId,
      String(body?.yearMonth ?? ""),
      user.displayName,
      String(body?.remark ?? ""),
    );
    return NextResponse.json({ ok: true, period }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
