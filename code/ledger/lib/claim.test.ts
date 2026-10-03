import assert from "node:assert/strict";
import { applyClaimAction, ClaimError, createDraft } from "./claim";
import { addAccount, openBook, trialBalance } from "./ledger";

async function main() {
  const book = await openBook("报销测试账");
  await addAccount(book.id, { code: "5602", name: "管理费用", kind: "expense" });
  await addAccount(book.id, { code: "2241", name: "其他应付款", kind: "liability" });

  const draft = await createDraft({
    bookId: book.id,
    applicant: "张三",
    department: "行政",
    costCenter: "公司公共",
    payeeName: "张三",
    payeeAccount: "6222000000000001",
    bankName: "测试银行",
    purpose: "办公用品",
    occurredOn: "2026-10-03",
    actor: "张三",
    items: [{ memo: "打印纸", cents: 12800 }],
  });
  assert.equal(draft.status, "draft");
  assert.equal(draft.revision, 1);
  assert.equal(draft.totalCents, 12800);

  const submitted = await applyClaimAction(draft.id, {
    action: "submit",
    actor: "张三",
    role: "employee",
    expectedRevision: 1,
    mutationId: "m-submit",
  });
  assert.equal(submitted.status, "financeReview");
  assert.equal(submitted.revision, 2);

  const againSubmit = await applyClaimAction(draft.id, {
    action: "submit",
    actor: "张三",
    role: "employee",
    expectedRevision: 1,
    mutationId: "m-submit",
  });
  assert.equal(againSubmit.revision, 2);
  assert.equal(againSubmit.status, "financeReview");

  const financed = await applyClaimAction(draft.id, {
    action: "financeApprove",
    actor: "财务李",
    role: "finance",
    expectedRevision: 2,
    mutationId: "m-finance",
    remark: "票据齐全",
  });
  assert.equal(financed.status, "gmReview");

  await assert.rejects(
    () => applyClaimAction(draft.id, {
      action: "gmApprove",
      actor: "张三",
      role: "employee",
      expectedRevision: 3,
      mutationId: "m-bad-role",
    }),
    (error: unknown) => error instanceof ClaimError && error.code === "CLAIM_FORBIDDEN",
  );

  const approved = await applyClaimAction(draft.id, {
    action: "gmApprove",
    actor: "总经理王",
    role: "gm",
    expectedRevision: 3,
    mutationId: "m-gm",
    remark: "同意",
  });
  assert.equal(approved.status, "paymentVoucher");
  assert.ok(approved.entryId);

  const againGm = await applyClaimAction(draft.id, {
    action: "gmApprove",
    actor: "总经理王",
    role: "gm",
    expectedRevision: 3,
    mutationId: "m-gm",
  });
  assert.equal(againGm.revision, 4);
  assert.equal(againGm.entryId, approved.entryId);

  const rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "5602")?.balanceCents, 12800);
  assert.equal(rows.find((row) => row.code === "2241")?.balanceCents, 12800);

  await assert.rejects(
    () => applyClaimAction(draft.id, {
      action: "financeApprove",
      actor: "财务李",
      role: "finance",
      expectedRevision: 4,
      mutationId: "m-late",
    }),
    (error: unknown) => error instanceof ClaimError && error.code === "CLAIM_STATUS_CHANGED",
  );

  console.log("claim ok");
}

main();
