import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { postPayrollBatch } from "@/lib/payroll";

export async function POST(
  request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await requireUser(request, ["finance", "gm"]);
    const { batchId } = await context.params;
    const body = await request.json();
    const batch = await postPayrollBatch(user, batchId, {
      expectedRevision: Number(body?.expectedRevision),
      mutationId: String(body?.mutationId ?? ""),
      remark: body?.remark,
    });
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    return fail(error);
  }
}
