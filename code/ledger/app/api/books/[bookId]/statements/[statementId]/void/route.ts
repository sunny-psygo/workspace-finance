import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { voidBankStatement } from "@/lib/payment";

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string; statementId: string }> },
) {
  try {
    const user = await requireUser(request, ["cashier", "finance"]);
    const { bookId, statementId } = await context.params;
    const body = await request.json();
    const statement = await voidBankStatement(user, bookId, statementId, body);
    return NextResponse.json({ ok: true, statement });
  } catch (error) {
    return fail(error);
  }
}
