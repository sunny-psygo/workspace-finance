import { NextResponse } from "next/server";
import { getClaim } from "@/lib/claim";
import { fail } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ claimId: string }> },
) {
  try {
    const { claimId } = await context.params;
    const claim = await getClaim(claimId);
    return NextResponse.json({ ok: true, claim });
  } catch (error) {
    return fail(error);
  }
}
