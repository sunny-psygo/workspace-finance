import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { reversePayrollPayment } from "@/lib/payroll";

export async function POST(
  request: Request,
  context: { params: Promise<{ batchId: string; allocationId: string }> },
) {
  try {
    const user = await requireUser(request, ["cashier", "finance"]);
    const { batchId, allocationId } = await context.params;
    const body = await request.json();
    const batch = await reversePayrollPayment(user, batchId, allocationId, {
      expectedRevision: Number(body?.expectedRevision),
      mutationId: String(body?.mutationId ?? ""),
      remark: String(body?.remark ?? ""),
    });
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    return fail(error);
  }
}
