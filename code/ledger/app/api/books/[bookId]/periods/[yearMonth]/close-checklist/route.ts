import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { periodCloseChecklist } from "@/lib/ledger";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string; yearMonth: string }> },
) {
  try {
    await requireUser(request);
    const { bookId, yearMonth } = await context.params;
    const checklist = await periodCloseChecklist(bookId, yearMonth);
    return NextResponse.json({ ok: true, checklist });
  } catch (error) {
    return fail(error);
  }
}
