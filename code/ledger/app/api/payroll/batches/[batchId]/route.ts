import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { getPayrollBatch } from "@/lib/payroll";

export async function GET(
  request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    await requireUser(request);
    const { batchId } = await context.params;
    const batch = await getPayrollBatch(batchId);
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    return fail(error);
  }
}
