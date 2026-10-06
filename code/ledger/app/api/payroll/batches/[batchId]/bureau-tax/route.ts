import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { importBureauTax } from "@/lib/payroll";

export async function POST(
  request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await requireUser(request, ["finance", "gm"]);
    const { batchId } = await context.params;
    const body = await request.json();
    const result = await importBureauTax(user, batchId, {
      expectedRevision: Number(body?.expectedRevision),
      mutationId: String(body?.mutationId ?? ""),
      results: body?.results,
    });
    return NextResponse.json({ ok: true, batch: result.batch });
  } catch (error) {
    return fail(error);
  }
}
