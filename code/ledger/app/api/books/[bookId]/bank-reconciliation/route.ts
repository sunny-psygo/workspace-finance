import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { bankReconciliation } from "@/lib/reconciliation";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const url = new URL(request.url);
    const bankAccountCode = url.searchParams.get("bankAccountCode") || "1002";
    const summary = await bankReconciliation(bookId, bankAccountCode);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return fail(error);
  }
}
