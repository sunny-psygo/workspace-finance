import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { postEntry } from "@/lib/ledger";

export async function GET(request: Request, context: { params: Promise<{ bookId: string }> }) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const period = new URL(request.url).searchParams.get("period") || "";
    const where: { bookId: string; occurredOn?: { startsWith: string } } = { bookId };
    if (period) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
        return NextResponse.json(
          { ok: false, code: "ENTRY_INVALID", message: "期间格式应为 YYYY-MM。", next: "例如 2026-02。" },
          { status: 400 },
        );
      }
      where.occurredOn = { startsWith: `${period}-` };
    }
    const entries = await db.entry.findMany({
      where,
      include: {
        postings: {
          include: { account: { select: { code: true, name: true } } },
          orderBy: { side: "asc" },
        },
      },
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
      take: 200,
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
