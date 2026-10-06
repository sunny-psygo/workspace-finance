import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { allocatePayrollPayment } from "@/lib/payroll";

export async function POST(
  request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await requireUser(request, ["cashier", "finance"]);
    const { batchId } = await context.params;
    const body = await request.json();
    const batch = await allocatePayrollPayment(user, batchId, {
      statementId: String(body?.statementId ?? ""),
      cents: Number(body?.cents),
      expectedRevision: Number(body?.expectedRevision),
      mutationId: String(body?.mutationId ?? ""),
      remark: body?.remark,
    });
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    return fail(error);
  }
}
