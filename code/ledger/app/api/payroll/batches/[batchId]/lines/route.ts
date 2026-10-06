import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { setPayrollLines } from "@/lib/payroll";

export async function PUT(
  request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await requireUser(request, ["hr", "finance", "gm"]);
    const { batchId } = await context.params;
    const body = await request.json();
    const batch = await setPayrollLines(user, batchId, {
      expectedRevision: Number(body?.expectedRevision),
      mutationId: String(body?.mutationId ?? ""),
      lines: body?.lines,
    });
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    return fail(error);
  }
}
