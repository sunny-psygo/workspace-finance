import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { openBook } from "@/lib/ledger";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const books = await db.book.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ ok: true, books });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(request, ["finance", "gm"]);
    const body = await request.json();
    const book = await openBook(String(body?.name ?? ""), String(body?.currency ?? "CNY"));
    return NextResponse.json({ ok: true, book }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
