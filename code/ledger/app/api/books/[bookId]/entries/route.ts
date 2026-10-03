import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { postEntry } from "@/lib/ledger";

export async function GET(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const entries = await db.entry.findMany({
      where: { bookId },
      include: { postings: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    await requireUser(request, ["finance", "gm"]);
    const { bookId } = await context.params;
    const body = await request.json();
    const entry = await postEntry(bookId, body);
    return NextResponse.json({ ok: true, entry }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
