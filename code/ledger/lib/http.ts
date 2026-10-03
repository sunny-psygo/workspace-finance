import { NextResponse } from "next/server";
import { ClaimError } from "./claim";
import { LedgerError } from "./ledger";

export function fail(error: unknown) {
  if (error instanceof LedgerError || error instanceof ClaimError) {
    const status = error.code === "CLAIM_REVISION_CONFLICT" || error.code === "CLAIM_STATUS_CHANGED"
      ? 409
      : error.code === "CLAIM_FORBIDDEN"
        ? 403
        : 400;
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message, next: error.next },
      { status },
    );
  }
  const message = error instanceof Error ? error.message : "未知错误";
  return NextResponse.json(
    { ok: false, code: "INTERNAL", message, next: "查看服务日志。这不是业务拒绝。" },
    { status: 500 },
  );
}
