import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { trialBalance } from "@/lib/ledger";

export async function GET(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const rows = await trialBalance(bookId);
    const debitCents = rows.reduce((sum, row) => sum + row.debitCents, 0);
    const creditCents = rows.reduce((sum, row) => sum + row.creditCents, 0);
    return NextResponse.json({ ok: true, rows, debitCents, creditCents, balanced: debitCents === creditCents });
  } catch (error) {
    return fail(error);
  }
}
