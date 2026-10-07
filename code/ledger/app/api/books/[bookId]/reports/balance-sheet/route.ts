import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { balanceSheet } from "@/lib/reports";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const report = await balanceSheet(bookId);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return fail(error);
  }
}
