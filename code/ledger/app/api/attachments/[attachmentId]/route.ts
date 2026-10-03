import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { ClaimError } from "@/lib/claim";

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
    const absolute = path.isAbsolute(attachment.storagePath)
      ? attachment.storagePath
      : path.join(process.cwd(), attachment.storagePath);
    await access(absolute);
    const info = await stat(absolute);
    const stream = createReadStream(absolute);
    return new NextResponse(Readable.toWeb(stream) as unknown as BodyInit, {
      headers: {
        "content-type": attachment.contentType || "application/octet-stream",
        "content-length": String(info.size),
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
