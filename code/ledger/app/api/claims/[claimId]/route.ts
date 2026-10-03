import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getClaim } from "@/lib/claim";
import { fail } from "@/lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ claimId: string }> },
) {
  try {
    await requireUser(request);
    const { claimId } = await context.params;
    const claim = await getClaim(claimId);
    return NextResponse.json({ ok: true, claim });
  } catch (error) {
    return fail(error);
  }
}
