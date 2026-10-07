import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createFixedAsset, listFixedAssets } from "@/lib/fixed-asset";
import { fail } from "@/lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId } = await context.params;
    const assets = await listFixedAssets(bookId);
    return NextResponse.json({ ok: true, assets });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const user = await requireUser(request, ["finance", "gm"]);
    const { bookId } = await context.params;
    const body = await request.json();
    const asset = await createFixedAsset(user, bookId, {
      code: String(body?.code ?? ""),
      name: String(body?.name ?? ""),
      startOn: String(body?.startOn ?? ""),
      costCents: Number(body?.costCents),
      residualRatePercent: body?.residualRatePercent,
      usefulMonths: Number(body?.usefulMonths),
      mutationId: String(body?.mutationId ?? ""),
      remark: body?.remark,
    });
    return NextResponse.json({ ok: true, asset });
  } catch (error) {
    return fail(error);
  }
}
