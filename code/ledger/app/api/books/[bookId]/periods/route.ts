import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { listPeriods } from "@/lib/ledger";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const periods = await listPeriods(bookId);
    return NextResponse.json({ ok: true, periods });
  } catch (error) {
    return fail(error);
  }
}
