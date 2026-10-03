import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { closeYear } from "@/lib/ledger";

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const user = await requireUser(request, ["finance", "gm"]);
    const { bookId } = await context.params;
    const body = await request.json();
    const yearClose = await closeYear(
      bookId,
      Number(body?.year),
      user.displayName,
      String(body?.remark ?? ""),
    );
    return NextResponse.json({ ok: true, yearClose });
  } catch (error) {
    return fail(error);
  }
}
