import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { listOpeningTax, upsertOpeningTax } from "@/lib/payroll";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const year = Number(new URL(request.url).searchParams.get("year"));
    if (!Number.isInteger(year)) {
      return NextResponse.json(
        { ok: false, code: "PAYROLL_INVALID", message: "year 须为整数。", next: "例如 ?year=2026" },
        { status: 400 },
      );
    }
    const openings = await listOpeningTax(bookId, year);
    return NextResponse.json({ ok: true, openings });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const user = await requireUser(request, ["finance", "gm"]);
    const { bookId } = await context.params;
    const body = await request.json();
    const openings = await upsertOpeningTax(user, bookId, {
      year: Number(body?.year),
      mutationId: String(body?.mutationId ?? ""),
      lines: body?.lines,
    });
    return NextResponse.json({ ok: true, openings });
  } catch (error) {
    return fail(error);
  }
}
