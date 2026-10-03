import { NextResponse } from "next/server";
import { applyClaimAction } from "@/lib/claim";
import { fail } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ claimId: string }> },
) {
  try {
    const { claimId } = await context.params;
    const body = await request.json();
    const claim = await applyClaimAction(claimId, body);
    return NextResponse.json({ ok: true, claim });
  } catch (error) {
    return fail(error);
  }
}