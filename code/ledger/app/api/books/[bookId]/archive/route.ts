import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listArchiveCases } from "@/lib/archive";
import { fail } from "@/lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || undefined;
    const keyword = url.searchParams.get("keyword") || undefined;
    const cases = await listArchiveCases(bookId, { period, keyword });
    return NextResponse.json({ ok: true, cases });
  } catch (error) {
    return fail(error);
  }
}
