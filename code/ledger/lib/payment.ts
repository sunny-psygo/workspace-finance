import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AuthUser, userHasAnyRole, userHasRole } from "./auth";
import { ClaimError } from "./claim";
import { db } from "./db";
import { postEntry } from "./ledger";

const statementInput = z.object({
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cents: z.number().int().positive(),
  bankAccountCode: z.string().trim().min(1).max(32),
  reference: z.string().trim().min(1).max(80),
  counterparty: z.string().trim().max(120).optional().default(""),
  remark: z.string().trim().max(200).optional().default(""),
});

const allocationInput = z.object({
  statementId: z.string().trim().min(1),
  cents: z.number().int().positive(),
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  remark: z.string().trim().max(200).optional().default(""),
  voucherNo: z.string().trim().max(80).optional().default(""),
  fileName: z.string().trim().max(180).optional(),
  fileBase64: z.string().optional(),
});

const paymentInput = z.object({
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  voucherNo: z.string().trim().min(1).max(80),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bankAccountCode: z.string().trim().min(1).max(32),
  remark: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(180),
  fileBase64: z.string().min(1),
  // 可指定本次核销额；默认付清剩余应付
  cents: z.number().int().positive().optional(),
});

const reverseAllocationInput = z.object({
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  remark: z.string().trim().min(1).max(200),
});

const voidStatementInput = z.object({
  remark: z.string().trim().min(1).max(200),
});

export type StatementInput = z.input<typeof statementInput>;
export type AllocationInput = z.input<typeof allocationInput>;
export type PaymentInput = z.input<typeof paymentInput>;
export type ReverseAllocationInput = z.input<typeof reverseAllocationInput>;
export type VoidStatementInput = z.input<typeof voidStatementInput>;

const claimInclude = {
  items: { include: { attachments: true } },
  events: { orderBy: { createdAt: "asc" as const } },
  allocations: { orderBy: { createdAt: "asc" as const } },
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_").slice(0, 120);
}

async function maybeStoreProof(claimId: string, fileName: string | undefined, fileBase64: string | undefined) {
  if (!fileName || !fileBase64) return { fileName: "", storagePath: "" };
  let fileBytes: Buffer;
  try {
    fileBytes = Buffer.from(fileBase64, "base64");
  } catch {
    throw new ClaimError("回单内容不是合法 base64。", "CLAIM_INVALID", "重新编码文件后再传。");
  }
  if (!fileBytes.length) throw new ClaimError("回单文件是空的。", "CLAIM_INVALID", "上传非空文件。");
  if (fileBytes.length > 5 * 1024 * 1024) {
    throw new ClaimError("回单超过 5MB。", "CLAIM_INVALID", "压缩后再传。");
  }
  const dir = path.join(process.cwd(), "data", "payment-vouchers", claimId);
  await mkdir(dir, { recursive: true });
  const absolute = path.join(dir, `${Date.now()}-${safeFileName(fileName)}`);
  await writeFile(absolute, fileBytes);
  return { fileName, storagePath: path.relative(process.cwd(), absolute) };
}

export async function importBankStatement(user: AuthUser, bookId: string, input: StatementInput) {
  if (!userHasAnyRole(user, ["cashier", "finance"])) {
    throw new ClaimError("只有出纳或财务可以导入银行流水。", "CLAIM_FORBIDDEN", "换有权限的账号。");
  }
  const parsed = statementInput.safeParse(input);
  if (!parsed.success) {
    throw new ClaimError(
      "流水字段不合要求。",
      "CLAIM_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) throw new ClaimError("账套不存在。", "CLAIM_INVALID", "先开账。");
  try {
    return await db.bankStatement.create({
      data: {
        id: randomUUID(),
        bookId,
        paidOn: data.paidOn,
        cents: data.cents,
        remainingCents: data.cents,
        bankAccountCode: data.bankAccountCode,
        reference: data.reference,
        counterparty: data.counterparty ?? "",
        remark: data.remark ?? "",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ClaimError(
        `流水号已存在：${data.reference}。`,
        "CLAIM_INVALID",
        "换一个 reference，或复用已有流水做匹配。",
      );
    }
    throw error;
  }
}

export async function listBankStatements(bookId: string) {
  if (!bookId.trim()) throw new ClaimError("缺少账套。", "CLAIM_INVALID", "传入 bookId。");
  return db.bankStatement.findMany({
    where: { bookId, voidedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/** 作废从未匹配（或匹配已全部撤销）的流水。 */
export async function voidBankStatement(user: AuthUser, bookId: string, statementId: string, input: VoidStatementInput) {
  if (!userHasAnyRole(user, ["cashier", "finance"])) {
    throw new ClaimError("只有出纳或财务可以作废银行流水。", "CLAIM_FORBIDDEN", "换有权限的账号。");
  }
  const parsed = voidStatementInput.safeParse(input);
  if (!parsed.success) {
    throw new ClaimError(
      "作废字段不合要求。",
      "CLAIM_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const statement = await db.bankStatement.findUnique({ where: { id: statementId } });
  if (!statement || statement.bookId !== bookId) {
    throw new ClaimError("银行流水不存在或不属于本账套。", "CLAIM_NOT_FOUND", "核对流水。");
  }
  if (statement.voidedAt) return statement;
  if (statement.remainingCents !== statement.cents) {
    throw new ClaimError(
      "流水仍有有效匹配，不能作废。",
      "CLAIM_INVALID",
      "先撤销全部匹配，或等 remaining 回到原额。",
    );
  }
  const activeAlloc = await db.paymentAllocation.count({
    where: { statementId: statement.id, reversedAt: null },
  });
  if (activeAlloc > 0) {
    throw new ClaimError(
      "流水仍有有效匹配，不能作废。",
      "CLAIM_INVALID",
      "先撤销全部匹配。",
    );
  }
  return db.bankStatement.update({
    where: { id: statement.id },
    data: {
      voidedAt: new Date(),
      voidedBy: user.displayName,
      voidRemark: data.remark,
      remainingCents: 0,
    },
  });
}

export async function allocatePayment(user: AuthUser, claimId: string, input: AllocationInput) {
  if (!userHasRole(user, "cashier")) {
    throw new ClaimError("只有出纳可以匹配付款。", "CLAIM_FORBIDDEN", "换出纳账号登录。");
  }
  const parsed = allocationInput.safeParse(input);
  if (!parsed.success) {
    throw new ClaimError(
      "匹配字段不合要求。",
      "CLAIM_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;

  const existing = await db.paymentAllocation.findUnique({
    where: { claimId_mutationId: { claimId, mutationId: data.mutationId } },
  });
  if (existing) {
    const claim = await db.claim.findUnique({ where: { id: claimId }, include: claimInclude });
    if (!claim) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
    return claim;
  }

  const claim = await db.claim.findUnique({ where: { id: claimId }, include: claimInclude });
  if (!claim) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
  if (claim.status !== "paymentVoucher") {
    throw new ClaimError(
      `状态 ${claim.status} 不能再匹配付款。`,
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

  const unpaid = claim.totalCents - claim.paidCents;
  if (data.cents > unpaid) {
    throw new ClaimError(
      `匹配金额 ${data.cents} 分超过未付 ${unpaid} 分。`,
      "CLAIM_INVALID",
      "减小匹配金额。",
    );
  }

  const statement = await db.bankStatement.findUnique({ where: { id: data.statementId } });
  if (!statement || statement.bookId !== claim.bookId) {
    throw new ClaimError("银行流水不存在或不属于本账套。", "CLAIM_NOT_FOUND", "先导入流水。");
  }
  if (statement.voidedAt) {
    throw new ClaimError("流水已作废，不能再匹配。", "CLAIM_INVALID", "换一条有效流水。");
  }
  if (data.cents > statement.remainingCents) {
    throw new ClaimError(
      `匹配金额超过流水剩余 ${statement.remainingCents} 分。`,
      "CLAIM_INVALID",
      "减小金额或换一条流水。",
    );
  }

  const proof = await maybeStoreProof(claim.id, data.fileName, data.fileBase64);
  const nextPaid = claim.paidCents + data.cents;
  const toStatus = nextPaid >= claim.totalCents ? "completed" : "paymentVoucher";

  return db.$transaction(async (tx) => {
    const entry = await postEntry(
      claim.bookId,
      {
        occurredOn: statement.paidOn,
        memo: `付款核销 ${claim.purpose}`.slice(0, 200),
        reference: `claim-pay:${claim.id}:${data.mutationId}`,
        postings: [
          { accountCode: claim.payableAccountCode, side: "debit", cents: data.cents },
          { accountCode: statement.bankAccountCode, side: "credit", cents: data.cents },
        ],
      },
      tx,
    );

    const statementTouched = await tx.bankStatement.updateMany({
      where: { id: statement.id, remainingCents: { gte: data.cents } },
      data: { remainingCents: { decrement: data.cents } },
    });
    if (statementTouched.count !== 1) {
      throw new ClaimError("流水剩余不足，匹配未写入。", "CLAIM_REVISION_CONFLICT", "刷新流水后重试。");
    }

    await tx.paymentAllocation.create({
      data: {
        id: randomUUID(),
        claimId: claim.id,
        statementId: statement.id,
        cents: data.cents,
        entryId: entry.id,
        mutationId: data.mutationId,
        voucherNo: data.voucherNo || statement.reference,
        fileName: proof.fileName,
        storagePath: proof.storagePath,
        remark: data.remark || "",
        uploadedBy: user.displayName,
      },
    });

    const claimTouched = await tx.claim.updateMany({
      where: { id: claim.id, revision: claim.revision, status: "paymentVoucher" },
      data: {
        paidCents: nextPaid,
        status: toStatus,
        revision: claim.revision + 1,
        lastMutationId: data.mutationId,
        paymentEntryId: entry.id,
        remark: data.remark || claim.remark,
      },
    });
    if (claimTouched.count !== 1) {
      throw new ClaimError("单据状态已变，匹配未写入。", "CLAIM_REVISION_CONFLICT", "刷新后重试。");
    }

    await tx.claimEvent.create({
      data: {
        id: randomUUID(),
        claimId: claim.id,
        action: "allocatePayment",
        fromStatus: "paymentVoucher",
        toStatus,
        actor: user.displayName,
        role: "cashier",
        mutationId: data.mutationId,
        remark: data.remark || `核销 ${data.cents} 分`,
      },
    });

    const updated = await tx.claim.findUnique({ where: { id: claim.id }, include: claimInclude });
    if (!updated) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
    return updated;
  });
}

/** 撤销一笔匹配：红冲核销分录，恢复流水剩余与单据未付。 */
export async function reverseAllocation(
  user: AuthUser,
  claimId: string,
  allocationId: string,
  input: ReverseAllocationInput,
) {
  if (!userHasRole(user, "cashier")) {
    throw new ClaimError("只有出纳可以撤销付款匹配。", "CLAIM_FORBIDDEN", "换出纳账号登录。");
  }
  const parsed = reverseAllocationInput.safeParse(input);
  if (!parsed.success) {
    throw new ClaimError(
      "撤销字段不合要求。",
      "CLAIM_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;

  const existingEvent = await db.claimEvent.findUnique({
    where: { claimId_mutationId: { claimId, mutationId: data.mutationId } },
  });
  if (existingEvent) {
    return db.claim.findUniqueOrThrow({ where: { id: claimId }, include: claimInclude });
  }

  const claim = await db.claim.findUnique({ where: { id: claimId }, include: claimInclude });
  if (!claim) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
  if (claim.status !== "paymentVoucher" && claim.status !== "completed") {
    throw new ClaimError(
      `状态 ${claim.status} 不能撤销付款匹配。`,
      "CLAIM_STATUS_CHANGED",
      "只处理待付款或已完成单据。",
    );
  }
  if (claim.revision !== data.expectedRevision) {
    throw new ClaimError(
      `版本冲突：期望 ${data.expectedRevision}，实际 ${claim.revision}。`,
      "CLAIM_REVISION_CONFLICT",
      "用最新 revision 重试。",
    );
  }

  const allocation = await db.paymentAllocation.findUnique({ where: { id: allocationId } });
  if (!allocation || allocation.claimId !== claimId) {
    throw new ClaimError("匹配记录不存在。", "CLAIM_NOT_FOUND", "核对匹配 id。");
  }
  if (allocation.reversedAt) {
    return claim;
  }

  const statement = await db.bankStatement.findUnique({ where: { id: allocation.statementId } });
  if (!statement || statement.bookId !== claim.bookId) {
    throw new ClaimError("银行流水不存在或不属于本账套。", "CLAIM_NOT_FOUND", "核对流水。");
  }

  const nextPaid = claim.paidCents - allocation.cents;
  if (nextPaid < 0) {
    throw new ClaimError("已付金额不足以撤销该匹配。", "CLAIM_INVALID", "数据不一致，联系管理员。");
  }
  const toStatus = nextPaid > 0 && nextPaid >= claim.totalCents ? "completed" : "paymentVoucher";
  const fromStatus = claim.status;

  return db.$transaction(async (tx) => {
    const reverseEntry = await postEntry(
      claim.bookId,
      {
        occurredOn: statement.paidOn,
        memo: `撤销核销 ${claim.purpose}`.slice(0, 200),
        reference: `pay-rev:${allocation.id}`,
        postings: [
          { accountCode: statement.bankAccountCode, side: "debit", cents: allocation.cents },
          { accountCode: claim.payableAccountCode, side: "credit", cents: allocation.cents },
        ],
      },
      tx,
    );

    const allocationTouched = await tx.paymentAllocation.updateMany({
      where: { id: allocation.id, reversedAt: null },
      data: {
        reversedAt: new Date(),
        reverseEntryId: reverseEntry.id,
        reverseMutationId: data.mutationId,
        reverseRemark: data.remark,
      },
    });
    if (allocationTouched.count !== 1) {
      throw new ClaimError("匹配已被撤销。", "CLAIM_REVISION_CONFLICT", "刷新后重试。");
    }

    await tx.bankStatement.update({
      where: { id: statement.id },
      data: { remainingCents: { increment: allocation.cents } },
    });

    const stillActive = await tx.paymentAllocation.findMany({
      where: { claimId: claim.id, reversedAt: null, id: { not: allocation.id } },
      orderBy: { createdAt: "desc" },
    });
    const paymentEntryId = stillActive[0]?.entryId ?? null;

    const claimTouched = await tx.claim.updateMany({
      where: {
        id: claim.id,
        revision: claim.revision,
        status: { in: ["paymentVoucher", "completed"] },
      },
      data: {
        paidCents: nextPaid,
        status: toStatus,
        revision: claim.revision + 1,
        lastMutationId: data.mutationId,
        paymentEntryId,
        remark: data.remark,
      },
    });
    if (claimTouched.count !== 1) {
      throw new ClaimError("单据状态已变，撤销未写入。", "CLAIM_REVISION_CONFLICT", "刷新后重试。");
    }

    await tx.claimEvent.create({
      data: {
        id: randomUUID(),
        claimId: claim.id,
        action: "reverseAllocation",
        fromStatus,
        toStatus,
        actor: user.displayName,
        role: "cashier",
        mutationId: data.mutationId,
        remark: data.remark,
      },
    });

    return tx.claim.findUniqueOrThrow({ where: { id: claim.id }, include: claimInclude });
  });
}

/** 兼容旧接口：导入一条流水并按指定/剩余金额匹配。 */
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

  const claim = await db.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
  if (claim.status === "completed") {
    return db.claim.findUniqueOrThrow({ where: { id: claimId }, include: claimInclude });
  }
  const unpaid = claim.totalCents - claim.paidCents;
  const cents = data.cents ?? unpaid;
  if (cents <= 0) throw new ClaimError("没有剩余应付。", "CLAIM_INVALID", "单据已付清。");

  const statement = await importBankStatement(user, claim.bookId, {
    paidOn: data.paidOn,
    cents,
    bankAccountCode: data.bankAccountCode,
    reference: data.voucherNo,
    counterparty: claim.payeeName,
    remark: data.remark,
  });

  return allocatePayment(user, claimId, {
    statementId: statement.id,
    cents,
    expectedRevision: data.expectedRevision,
    mutationId: data.mutationId,
    remark: data.remark,
    voucherNo: data.voucherNo,
    fileName: data.fileName,
    fileBase64: data.fileBase64,
  });
}
