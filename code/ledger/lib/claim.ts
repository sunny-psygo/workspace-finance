import { randomUUID } from "node:crypto";
import { z } from "zod";
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

const roles = ["employee", "finance", "gm"] as const;
export type ClaimRole = (typeof roles)[number];

const claimStatuses = ["draft", "financeReview", "gmReview", "paymentVoucher", "rejected", "voided"] as const;
export type ClaimStatus = (typeof claimStatuses)[number];

const itemInput = z.object({
  category: z.string().trim().max(40).optional(),
  memo: z.string().trim().min(1).max(120),
  cents: z.number().int().positive(),
});

const draftInput = z.object({
  bookId: z.string().trim().min(1),
  applicant: z.string().trim().min(1).max(40),
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
  actor: z.string().trim().min(1).max(40),
});

const actionInput = z.object({
  action: z.enum(["submit", "financeApprove", "gmApprove", "reject", "void"]),
  actor: z.string().trim().min(1).max(40),
  role: z.enum(roles),
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  remark: z.string().trim().max(200).optional(),
});

export type DraftInput = z.input<typeof draftInput>;
export type ActionInput = z.input<typeof actionInput>;

const claimInclude = { items: true, events: { orderBy: { createdAt: "asc" as const } } };

function roleAllowed(action: ActionInput["action"], role: ClaimRole) {
  if (action === "submit") return role === "employee";
  if (action === "financeApprove") return role === "finance";
  if (action === "gmApprove" || action === "void") return role === "gm";
  if (action === "reject") return role === "finance" || role === "gm";
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

export async function createDraft(input: DraftInput) {
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
  const totalCents = data.items.reduce((sum, item) => sum + item.cents, 0);
  return db.claim.create({
    data: {
      id: randomUUID(),
      bookId: data.bookId,
      requestType: "expense",
      status: "draft",
      revision: 1,
      applicant: data.applicant,
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
          cents: item.cents,
        })),
      },
      events: {
        create: {
          id: randomUUID(),
          action: "create",
          fromStatus: "draft",
          toStatus: "draft",
          actor: data.actor,
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

export async function applyClaimAction(claimId: string, input: ActionInput) {
  const parsed = actionInput.safeParse(input);
  if (!parsed.success) {
    throw new ClaimError(
      "动作字段不合要求。",
      "CLAIM_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;
  if (!roleAllowed(data.action, data.role)) {
    throw new ClaimError(`角色 ${data.role} 不能执行 ${data.action}。`, "CLAIM_FORBIDDEN", "换有权限的角色再试。");
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
        actor: data.actor,
        role: data.role,
        mutationId: data.mutationId,
        remark: data.remark,
      },
    });
    const updated = await tx.claim.findUnique({ where: { id: claim.id }, include: claimInclude });
    if (!updated) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
    return updated;
  });
}
