import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { disposeFixedAsset } from "@/lib/fixed-asset";
import { fail } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  try {
    const user = await requireUser(request, ["finance", "gm"]);
    const { assetId } = await context.params;
    const body = await request.json();
    const asset = await disposeFixedAsset(user, assetId, {
      occurredOn: String(body?.occurredOn ?? ""),
      mutationId: String(body?.mutationId ?? ""),
      remark: String(body?.remark ?? ""),
    });
    return NextResponse.json({ ok: true, asset });
  } catch (error) {
    return fail(error);
  }
}
