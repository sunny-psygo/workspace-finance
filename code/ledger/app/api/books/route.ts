import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { openBook } from "@/lib/ledger";

export async function GET() {
  const books = await db.book.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ ok: true, books });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const book = await openBook(String(body?.name ?? ""), String(body?.currency ?? "CNY"));
    return NextResponse.json({ ok: true, book }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
