import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getBlobStore } from "@/lib/blob-store";
import { ClaimError } from "@/lib/claim";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  try {
    await requireUser(request);
    const { attachmentId } = await context.params;
    const attachment = await db.claimAttachment.findUnique({
      where: { id: attachmentId },
      include: { claimItem: { include: { claim: true } } },
    });
    if (!attachment) {
      throw new ClaimError("附件不存在。", "CLAIM_NOT_FOUND", "核对附件 id。");
    }
    const bytes = await getBlobStore().get(attachment.storagePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": attachment.contentType || "application/octet-stream",
        "content-length": String(bytes.length),
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
