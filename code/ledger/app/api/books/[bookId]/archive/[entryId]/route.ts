import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getArchiveCase } from "@/lib/archive";
import { fail } from "@/lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ bookId: string; entryId: string }> },
) {
  try {
    await requireUser(request);
    const { bookId, entryId } = await context.params;
    const archiveCase = await getArchiveCase(bookId, entryId);
    if (!archiveCase) {
      return NextResponse.json(
        { ok: false, code: "ARCHIVE_NOT_FOUND", message: "主卷不存在。", next: "核对 entryId。" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, case: archiveCase });
  } catch (error) {
    return fail(error);
  }
}
