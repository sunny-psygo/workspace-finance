import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { incomeStatement } from "@/lib/reports";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const yearMonth = new URL(request.url).searchParams.get("yearMonth") || "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
      return NextResponse.json(
        { ok: false, code: "REPORT_INVALID", message: "需要 yearMonth=YYYY-MM。", next: "例如 2026-02。" },
        { status: 400 },
      );
    }
    const report = await incomeStatement(bookId, yearMonth);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return fail(error);
  }
}
