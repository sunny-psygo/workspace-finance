import { randomUUID } from "node:crypto";
import { z } from "zod";
import { assertClaimItemsHaveAttachments } from "./attachment";
import { AuthUser, userHasAnyRole, userHasRole } from "./auth";
import { db } from "./db";
import { postEntry } from "./ledger";

export class ClaimError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly next: string,
  ) {
    super(message);
  }
}

const claimStatuses = ["draft", "financeReview", "gmReview", "paymentVoucher", "rejected", "voided", "completed"] as const;
export type ClaimStatus = (typeof claimStatuses)[number];

const itemInput = z.object({
  category: z.string().trim().max(40).optional(),
  memo: z.string().trim().min(1).max(120),
  invoiceNo: z.string().trim().max(64).optional(),
  cents: z.number().int().positive(),
});

const ignoredInvoiceLabels = new Set(["", "无", "无票", "无发票", "支付截图"]);

export function normalizeInvoiceNo(value: string | undefined | null) {
  const raw = String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "");
  if (!raw || ignoredInvoiceLabels.has(String(value ?? "").trim()) || ignoredInvoiceLabels.has(raw)) {
    return "";
  }
  return raw;
}

function assertNoDuplicateInvoiceNos(
  items: Array<{ memo: string; invoiceNo?: string | null }>,
) {
  const seen = new Map<string, string>();
  for (const item of items) {
    const invoiceNo = normalizeInvoiceNo(item.invoiceNo);
    if (!invoiceNo) continue;
    const prior = seen.get(invoiceNo);
    if (prior) {
      throw new ClaimError(
        `本单发票号重复：${invoiceNo}（${prior} 与 ${item.memo}）。`,
        "CLAIM_INVOICE_DUPLICATE",
        "同一张单里不要填相同发票号。",
      );
    }
    seen.set(invoiceNo, item.memo);
  }
}

async function assertInvoicesAvailable(bookId: string, claimId: string, items: Array<{ memo: string; invoiceNo?: string | null }>) {
  assertNoDuplicateInvoiceNos(items);
  const invoiceNos = [...new Set(items.map((item) => normalizeInvoiceNo(item.invoiceNo)).filter(Boolean))];
  if (!invoiceNos.length) return;
  const conflicts = await db.claimItem.findMany({
    where: {
      invoiceNo: { in: invoiceNos },
      claim: {
        bookId,
        id: { not: claimId },
        status: { not: "voided" },
      },
    },
    include: { claim: { select: { id: true, status: true, purpose: true } } },
    take: 20,
  });
  if (!conflicts.length) return;
  const detail = conflicts
    .map((row) => `${row.invoiceNo} 已在单据 ${row.claim.id}（${row.claim.status}）`)
    .join("；");
  throw new ClaimError(
    `发票号已被占用：${detail}。`,
    "CLAIM_INVOICE_DUPLICATE",
    "换发票，或先作废占用该号的单据。",
  );
}

const draftInput = z.object({
  bookId: z.string().trim().min(1),
  department: z.string().trim().min(1).max(40),
  costCenter: z.string().trim().min(1).max(40),
  payeeName: z.string().trim().min(1).max(80),
  payeeAccount: z.string().trim().min(1).max(40),
  bankName: z.string().trim().min(1).max(80),
  purpose: z.string().trim().min(1).max(200),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expenseAccountCode: z.string().trim().min(1).max(32).optional().default("5602"),
  payableAccountCode: z.string().trim().min(1).max(32).optional().default("2241"),
  items: z.array(itemInput).min(1),
});

const actionInput = z.object({
  action: z.enum(["submit", "financeApprove", "gmApprove", "reject", "void"]),
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  remark: z.string().trim().max(200).optional(),
});

export type DraftInput = z.input<typeof draftInput>;
export type ActionInput = z.input<typeof actionInput>;

const claimInclude = {
  items: { include: { attachments: true } },
  events: { orderBy: { createdAt: "asc" as const } },
  payment: true,
};

function roleAllowed(action: ActionInput["action"], user: AuthUser) {
  if (action === "submit") return userHasRole(user, "employee");
  if (action === "financeApprove") return userHasRole(user, "finance");
  if (action === "gmApprove" || action === "void") return userHasRole(user, "gm");
  if (action === "reject") return userHasAnyRole(user, ["finance", "gm"]);
  return false;
}

function nextStatus(action: ActionInput["action"], current: ClaimStatus): ClaimStatus {
  if (action === "submit" && (current === "draft" || current === "rejected")) return "financeReview";
  if (action === "financeApprove" && current === "financeReview") return "gmReview";
  if (action === "gmApprove" && current === "gmReview") return "paymentVoucher";
  if (action === "reject" && (current === "financeReview" || current === "gmReview")) return "rejected";
  if (action === "void" && current === "paymentVoucher") return "voided";
  throw new ClaimError(
    `状态 ${current} 不能执行 ${action}。`,
    "CLAIM_STATUS_CHANGED",
    "刷新单据后按当前状态操作。",
  );
}

async function loadClaim(claimId: string) {
  const claim = await db.claim.findUnique({ where: { id: claimId }, include: claimInclude });
  if (!claim) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号，或先创建草稿。");
  return claim;
}

export async function createDraft(user: AuthUser, input: DraftInput) {
  if (!userHasRole(user, "employee")) {
    throw new ClaimError("只有员工可以建报销草稿。", "CLAIM_FORBIDDEN", "换员工账号登录。");
  }
  const parsed = draftInput.safeParse(input);
  if (!parsed.success) {
    throw new ClaimError(
      "报销字段不合要求。",
      "CLAIM_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const book = await db.book.findUnique({ where: { id: data.bookId } });
  if (!book) throw new ClaimError("账套不存在。", "CLAIM_INVALID", "先开账，再用返回的 bookId。");
  assertNoDuplicateInvoiceNos(data.items);
  const totalCents = data.items.reduce((sum, item) => sum + item.cents, 0);
  const claimId = randomUUID();
  await assertInvoicesAvailable(data.bookId, claimId, data.items);
  return db.claim.create({
    data: {
      id: claimId,
      bookId: data.bookId,
      requestType: "expense",
      status: "draft",
      revision: 1,
      applicant: user.displayName,
      department: data.department,
      costCenter: data.costCenter,
      payeeName: data.payeeName,
      payeeAccount: data.payeeAccount,
      bankName: data.bankName,
      purpose: data.purpose,
      occurredOn: data.occurredOn,
      expenseAccountCode: data.expenseAccountCode,
      payableAccountCode: data.payableAccountCode,
      totalCents,
      items: {
        create: data.items.map((item) => ({
          id: randomUUID(),
          category: item.category ?? "",
          memo: item.memo,
          invoiceNo: normalizeInvoiceNo(item.invoiceNo),
          cents: item.cents,
        })),
      },
      events: {
        create: {
          id: randomUUID(),
          action: "create",
          fromStatus: "draft",
          toStatus: "draft",
          actor: user.displayName,
          role: "employee",
          mutationId: `create-${randomUUID()}`,
        },
      },
    },
    include: claimInclude,
  });
}

export async function listClaims(bookId: string) {
  if (!bookId.trim()) throw new ClaimError("缺少账套。", "CLAIM_INVALID", "传入 bookId。");
  return db.claim.findMany({
    where: { bookId },
    include: claimInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getClaim(claimId: string) {
  return loadClaim(claimId);
}

export async function applyClaimAction(user: AuthUser, claimId: string, input: ActionInput) {
  const parsed = actionInput.safeParse(input);
  if (!parsed.success) {
    throw new ClaimError(
      "动作字段不合要求。",
      "CLAIM_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;
  if (!roleAllowed(data.action, user)) {
    throw new ClaimError(`当前账号不能执行 ${data.action}。`, "CLAIM_FORBIDDEN", "换有权限的账号登录。");
  }
  if ((data.action === "reject" || data.action === "void") && !data.remark?.trim()) {
    throw new ClaimError("驳回或作废必须填写原因。", "CLAIM_INVALID", "在 remark 里写原因。");
  }

  const existingEvent = await db.claimEvent.findUnique({
    where: { claimId_mutationId: { claimId, mutationId: data.mutationId } },
  });
  if (existingEvent) return loadClaim(claimId);

  const claim = await loadClaim(claimId);
  if (claim.revision !== data.expectedRevision) {
    throw new ClaimError(
      `版本冲突：期望 ${data.expectedRevision}，实际 ${claim.revision}。`,
      "CLAIM_REVISION_CONFLICT",
      "用最新 revision 重试。",
    );
  }
  if (claim.lastMutationId === data.mutationId) return claim;

  const fromStatus = claim.status as ClaimStatus;
  const toStatus = nextStatus(data.action, fromStatus);
  if (data.action === "submit") {
    await assertClaimItemsHaveAttachments(claim.items);
    await assertInvoicesAvailable(claim.bookId, claim.id, claim.items);
  }
  const eventRole = data.action === "submit"
    ? "employee"
    : data.action === "financeApprove" || (data.action === "reject" && userHasRole(user, "finance"))
      ? "finance"
      : data.action === "void" || data.action === "gmApprove" || data.action === "reject"
        ? "gm"
        : user.roles[0];

  return db.$transaction(async (tx) => {
    let entryId = claim.entryId;
    if (data.action === "gmApprove") {
      if (!claim.items.length || claim.totalCents <= 0) {
        throw new ClaimError("没有可入账的明细。", "CLAIM_INVALID", "先补明细金额。");
      }
      const entry = await postEntry(
        claim.bookId,
        {
          occurredOn: claim.occurredOn,
          memo: `报销 ${claim.purpose}`.slice(0, 200),
          reference: `claim:${claim.id}`,
          postings: [
            { accountCode: claim.expenseAccountCode, side: "debit", cents: claim.totalCents },
            { accountCode: claim.payableAccountCode, side: "credit", cents: claim.totalCents },
          ],
        },
        tx,
      );
      entryId = entry.id;
    }

    const touched = await tx.claim.updateMany({
      where: { id: claim.id, revision: claim.revision },
      data: {
        status: toStatus,
        revision: claim.revision + 1,
        lastMutationId: data.mutationId,
        remark: data.remark ?? claim.remark,
        entryId,
      },
    });
    if (touched.count !== 1) {
      throw new ClaimError(
        `版本冲突：期望 ${data.expectedRevision}，实际已变更。`,
        "CLAIM_REVISION_CONFLICT",
        "用最新 revision 重试。",
      );
    }
    await tx.claimEvent.create({
      data: {
        id: randomUUID(),
        claimId: claim.id,
        action: data.action,
        fromStatus,
        toStatus,
        actor: user.displayName,
        role: eventRole,
        mutationId: data.mutationId,
        remark: data.remark,
      },
    });
    const updated = await tx.claim.findUnique({ where: { id: claim.id }, include: claimInclude });
    if (!updated) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
    return updated;
  });
}
