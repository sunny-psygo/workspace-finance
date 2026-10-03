import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { reverseAllocation } from "@/lib/payment";

export async function POST(
  request: Request,
  context: { params: Promise<{ claimId: string; allocationId: string }> },
) {
  try {
    const user = await requireUser(request, ["cashier"]);
    const { claimId, allocationId } = await context.params;
    const body = await request.json();
    const claim = await reverseAllocation(user, claimId, allocationId, body);
    return NextResponse.json({ ok: true, claim });
  } catch (error) {
    return fail(error);
  }
}
