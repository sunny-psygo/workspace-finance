import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { addAccount } from "@/lib/ledger";

export async function GET(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const accounts = await db.account.findMany({ where: { bookId }, orderBy: { code: "asc" } });
    return NextResponse.json({ ok: true, accounts });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    await requireUser(request, ["finance", "gm"]);
    const { bookId } = await context.params;
    const body = await request.json();
    const account = await addAccount(bookId, body);
    return NextResponse.json({ ok: true, account }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
