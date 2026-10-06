import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { createPayrollBatch, listPayrollBatches } from "@/lib/payroll";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const period = new URL(request.url).searchParams.get("period") || undefined;
    const batches = await listPayrollBatches(bookId, period);
    return NextResponse.json({ ok: true, batches });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const user = await requireUser(request, ["hr", "finance", "gm"]);
    const { bookId } = await context.params;
    const body = await request.json();
    const batch = await createPayrollBatch(user, bookId, {
      period: String(body?.period ?? ""),
      taxPeriod: body?.taxPeriod,
      remark: body?.remark,
      mutationId: String(body?.mutationId ?? ""),
    });
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    return fail(error);
  }
}
