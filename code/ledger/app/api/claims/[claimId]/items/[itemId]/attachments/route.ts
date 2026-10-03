import { NextResponse } from "next/server";
import { uploadClaimItemAttachment } from "@/lib/attachment";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ claimId: string; itemId: string }> },
) {
  try {
    const user = await requireUser(request, ["employee"]);
    const { claimId, itemId } = await context.params;
    const body = await request.json();
    const attachment = await uploadClaimItemAttachment(user, claimId, itemId, body);
    return NextResponse.json({ ok: true, attachment }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
