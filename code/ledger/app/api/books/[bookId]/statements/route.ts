import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { importBankStatement, listBankStatements } from "@/lib/payment";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const statements = await listBankStatements(bookId);
    return NextResponse.json({ ok: true, statements });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const user = await requireUser(request, ["cashier", "finance"]);
    const { bookId } = await context.params;
    const body = await request.json();
    const statement = await importBankStatement(user, bookId, body);
    return NextResponse.json({ ok: true, statement }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
