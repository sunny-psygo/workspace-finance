import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AuthUser, userHasRole } from "./auth";
import { ClaimError } from "./claim";
import { db } from "./db";
import { postEntry } from "./ledger";

const paymentInput = z.object({
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  voucherNo: z.string().trim().min(1).max(80),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bankAccountCode: z.string().trim().min(1).max(32),
  remark: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(180),
  fileBase64: z.string().min(1),
});

export type PaymentInput = z.input<typeof paymentInput>;

const claimInclude = {
  items: { include: { attachments: true } },
  events: { orderBy: { createdAt: "asc" as const } },
  payment: true,
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_").slice(0, 120);
}

export async function completePayment(user: AuthUser, claimId: string, input: PaymentInput) {
  if (!userHasRole(user, "cashier")) {
    throw new ClaimError("只有出纳可以上传付款凭证。", "CLAIM_FORBIDDEN", "换出纳账号登录。");
  }
  const parsed = paymentInput.safeParse(input);
  if (!parsed.success) {
    throw new ClaimError(
      "付款字段不合要求。",
      "CLAIM_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;

  const existingEvent = await db.claimEvent.findUnique({
    where: { claimId_mutationId: { claimId, mutationId: data.mutationId } },
  });
  if (existingEvent) {
    const claim = await db.claim.findUnique({ where: { id: claimId }, include: claimInclude });
    if (!claim) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
    return claim;
  }

  const claim = await db.claim.findUnique({ where: { id: claimId }, include: claimInclude });
  if (!claim) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
  if (claim.status === "completed" && claim.payment) return claim;
  if (claim.status !== "paymentVoucher") {
    throw new ClaimError(
      `状态 ${claim.status} 不能上传付款凭证。`,
      "CLAIM_STATUS_CHANGED",
      "只处理待付款单据。",
    );
  }
  if (claim.revision !== data.expectedRevision) {
    throw new ClaimError(
      `版本冲突：期望 ${data.expectedRevision}，实际 ${claim.revision}。`,
      "CLAIM_REVISION_CONFLICT",
      "用最新 revision 重试。",
    );
  }

  let fileBytes: Buffer;
  try {
    fileBytes = Buffer.from(data.fileBase64, "base64");
  } catch {
    throw new ClaimError("回单内容不是合法 base64。", "CLAIM_INVALID", "重新编码文件后再传。");
  }
  if (!fileBytes.length) throw new ClaimError("回单文件是空的。", "CLAIM_INVALID", "上传非空文件。");
  if (fileBytes.length > 5 * 1024 * 1024) {
    throw new ClaimError("回单超过 5MB。", "CLAIM_INVALID", "压缩后再传。");
  }

  const dir = path.join(process.cwd(), "data", "payment-vouchers", claim.id);
  await mkdir(dir, { recursive: true });
  const storedName = `${Date.now()}-${safeFileName(data.fileName)}`;
  const absolute = path.join(dir, storedName);
  await writeFile(absolute, fileBytes);
  const storagePath = path.relative(process.cwd(), absolute);

  return db.$transaction(async (tx) => {
    const entry = await postEntry(
      claim.bookId,
      {
        occurredOn: data.paidOn,
        memo: `付款核销 ${claim.purpose}`.slice(0, 200),
        reference: `claim-pay:${claim.id}`,
        postings: [
          { accountCode: claim.payableAccountCode, side: "debit", cents: claim.totalCents },
          { accountCode: data.bankAccountCode, side: "credit", cents: claim.totalCents },
        ],
      },
      tx,
    );

    await tx.paymentVoucher.create({
      data: {
        id: randomUUID(),
        claimId: claim.id,
        voucherNo: data.voucherNo,
        paidOn: data.paidOn,
        bankAccountCode: data.bankAccountCode,
        cents: claim.totalCents,
        fileName: data.fileName,
        storagePath,
        remark: data.remark,
        entryId: entry.id,
        uploadedBy: user.displayName,
      },
    });

    const touched = await tx.claim.updateMany({
      where: { id: claim.id, revision: claim.revision, status: "paymentVoucher" },
      data: {
        status: "completed",
        revision: claim.revision + 1,
        lastMutationId: data.mutationId,
        paymentEntryId: entry.id,
        remark: data.remark,
      },
    });
    if (touched.count !== 1) {
      throw new ClaimError(
        "单据状态已变，付款未写入。",
        "CLAIM_REVISION_CONFLICT",
        "刷新后重试。",
      );
    }

    await tx.claimEvent.create({
      data: {
        id: randomUUID(),
        claimId: claim.id,
        action: "completePayment",
        fromStatus: "paymentVoucher",
        toStatus: "completed",
        actor: user.displayName,
        role: "cashier",
        mutationId: data.mutationId,
        remark: data.remark,
      },
    });

    const updated = await tx.claim.findUnique({ where: { id: claim.id }, include: claimInclude });
    if (!updated) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
    return updated;
  });
}
