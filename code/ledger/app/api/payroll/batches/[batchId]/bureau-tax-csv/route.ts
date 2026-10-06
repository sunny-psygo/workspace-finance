import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { importBureauTaxFromCsv } from "@/lib/payroll";

export async function POST(
  request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await requireUser(request, ["finance", "gm"]);
    const { batchId } = await context.params;
    const body = await request.json();
    const result = await importBureauTaxFromCsv(user, batchId, {
      expectedRevision: Number(body?.expectedRevision),
      mutationId: String(body?.mutationId ?? ""),
      csv: String(body?.csv ?? ""),
    });
    return NextResponse.json({ ok: true, batch: result.batch });
  } catch (error) {
    return fail(error);
  }
}
