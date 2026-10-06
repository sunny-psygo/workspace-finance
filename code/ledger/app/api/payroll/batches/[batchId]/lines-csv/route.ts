import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { setPayrollLinesFromCsv } from "@/lib/payroll";

export async function PUT(
  request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await requireUser(request, ["hr", "finance", "gm"]);
    const { batchId } = await context.params;
    const body = await request.json();
    const batch = await setPayrollLinesFromCsv(user, batchId, {
      expectedRevision: Number(body?.expectedRevision),
      mutationId: String(body?.mutationId ?? ""),
      csv: String(body?.csv ?? ""),
    });
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    return fail(error);
  }
}
