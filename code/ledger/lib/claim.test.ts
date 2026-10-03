import assert from "node:assert/strict";
import { uploadClaimItemAttachment } from "./attachment";
import { createUser, login } from "./auth";
import { applyClaimAction, ClaimError, createDraft } from "./claim";
import { openBook, trialBalance } from "./ledger";
import {
  allocatePayment,
  completePayment,
  importBankStatement,
  listBankStatements,
  reverseAllocation,
} from "./payment";
import { bankReconciliation } from "./reconciliation";

async function user(username: string, displayName: string, roles: Array<"employee" | "finance" | "gm" | "cashier">) {
  try {
    return await createUser({ username, displayName, password: "Passw0rd!", roles });
  } catch {
    const session = await login({ username, password: "Passw0rd!" });
    return session.user;
  }
}

async function main() {
  const suffix = Date.now().toString(36);
  const employee = await user(`e_${suffix}`, "张三", ["employee"]);
  const finance = await user(`f_${suffix}`, "财务李", ["finance"]);
  const gm = await user(`g_${suffix}`, "总经理王", ["gm"]);
  const cashier = await user(`c_${suffix}`, "出纳赵", ["cashier"]);

  const book = await openBook(`报销测试账-${suffix}`);
  // openBook 已种子 1002/2241/5602

  const draft = await createDraft(employee, {
    bookId: book.id,
    department: "行政",
    costCenter: "公司公共",
    payeeName: "张三",
    payeeAccount: "6222000000000001",
    bankName: "测试银行",
    purpose: "办公用品",
    occurredOn: "2026-10-04",
    items: [{ memo: "打印纸", cents: 12800, invoiceNo: `INV-${suffix}` }],
  });
  assert.equal(draft.items[0]?.invoiceNo, `INV-${suffix}`.toUpperCase().replace(/[\s-]+/g, ""));

  await assert.rejects(
    () => applyClaimAction(employee, draft.id, {
      action: "submit",
      expectedRevision: 1,
      mutationId: "no-attach",
    }),
    (error: unknown) => error instanceof ClaimError && error.code === "CLAIM_ATTACHMENT_REQUIRED",
  );

  await uploadClaimItemAttachment(employee, draft.id, draft.items[0]!.id, {
    fileName: "发票.pdf",
    contentType: "application/pdf",
    fileBase64: Buffer.from("%PDF-demo").toString("base64"),
  });

  const submitted = await applyClaimAction(employee, draft.id, {
    action: "submit",
    expectedRevision: 1,
    mutationId: "m-submit",
  });
  assert.equal(submitted.status, "financeReview");

  await assert.rejects(
    () => createDraft(employee, {
      bookId: book.id,
      department: "行政",
      costCenter: "公司公共",
      payeeName: "张三",
      payeeAccount: "6222",
      bankName: "测试银行",
      purpose: "抢发票",
      occurredOn: "2026-10-04",
      items: [{ memo: "再报", cents: 100, invoiceNo: `INV-${suffix}` }],
    }),
    (error: unknown) => error instanceof ClaimError && error.code === "CLAIM_INVOICE_DUPLICATE",
  );

  const financed = await applyClaimAction(finance, draft.id, {
    action: "financeApprove",
    expectedRevision: 2,
    mutationId: "m-finance",
    remark: "票据齐全",
  });
  assert.equal(financed.status, "gmReview");

  const approved = await applyClaimAction(gm, draft.id, {
    action: "gmApprove",
    expectedRevision: 3,
    mutationId: "m-gm",
    remark: "同意",
  });
  assert.equal(approved.status, "paymentVoucher");

  // 另建一张仅确认应付后作废，确认红冲
  const voidDraft = await createDraft(employee, {
    bookId: book.id,
    department: "行政",
    costCenter: "公司公共",
    payeeName: "张三",
    payeeAccount: "6222",
    bankName: "测试银行",
    purpose: "作废样例",
    occurredOn: "2026-10-04",
    items: [{ memo: "作废项", cents: 3000, invoiceNo: `VOID-${suffix}` }],
  });
  await uploadClaimItemAttachment(employee, voidDraft.id, voidDraft.items[0]!.id, {
    fileName: "v.pdf",
    fileBase64: Buffer.from("v").toString("base64"),
  });
  await applyClaimAction(employee, voidDraft.id, { action: "submit", expectedRevision: 1, mutationId: "vs" });
  await applyClaimAction(finance, voidDraft.id, { action: "financeApprove", expectedRevision: 2, mutationId: "vf", remark: "ok" });
  await applyClaimAction(gm, voidDraft.id, { action: "gmApprove", expectedRevision: 3, mutationId: "vg", remark: "ok" });
  const voided = await applyClaimAction(gm, voidDraft.id, {
    action: "void",
    expectedRevision: 4,
    mutationId: "vv",
    remark: "重复报销作废",
  });
  assert.equal(voided.status, "voided");
  let midRows = await trialBalance(book.id);
  assert.equal(midRows.find((row) => row.code === "5602")?.balanceCents, 12800);
  assert.equal(midRows.find((row) => row.code === "2241")?.balanceCents, 12800);

  const stmt = await importBankStatement(cashier, book.id, {
    paidOn: "2026-10-04",
    cents: 12800,
    bankAccountCode: "1002",
    reference: `BANK-${suffix}`,
    counterparty: "张三",
    remark: "办公用品",
  });
  assert.equal(stmt.remainingCents, 12800);

  const part = await allocatePayment(cashier, draft.id, {
    statementId: stmt.id,
    cents: 6000,
    expectedRevision: 4,
    mutationId: "m-pay-1",
    remark: "先付 60",
    voucherNo: "P1",
    fileName: "p1.txt",
    fileBase64: Buffer.from("part1").toString("base64"),
  });
  assert.equal(part.status, "paymentVoucher");
  assert.equal(part.paidCents, 6000);

  let rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "2241")?.balanceCents, 6800);
  assert.equal(rows.find((row) => row.code === "1002")?.balanceCents, -6000);

  const done = await allocatePayment(cashier, draft.id, {
    statementId: stmt.id,
    cents: 6800,
    expectedRevision: 5,
    mutationId: "m-pay-2",
    remark: "付清",
    voucherNo: "P2",
    fileName: "p2.txt",
    fileBase64: Buffer.from("part2").toString("base64"),
  });
  assert.equal(done.status, "completed");
  assert.equal(done.paidCents, 12800);
  assert.equal(done.allocations.length, 2);

  const again = await allocatePayment(cashier, draft.id, {
    statementId: stmt.id,
    cents: 6800,
    expectedRevision: 5,
    mutationId: "m-pay-2",
    remark: "付清",
  });
  assert.equal(again.revision, done.revision);

  rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "5602")?.balanceCents, 12800);
  assert.equal(rows.find((row) => row.code === "2241")?.balanceCents, 0);
  assert.equal(rows.find((row) => row.code === "1002")?.balanceCents, -12800);

  // 撤销最后一笔匹配：付清单退回待付款，银行与应付回落
  const lastAlloc = done.allocations[done.allocations.length - 1]!;
  const reversed = await reverseAllocation(cashier, draft.id, lastAlloc.id, {
    expectedRevision: done.revision,
    mutationId: "m-rev-1",
    remark: "配错流水撤销",
  });
  assert.equal(reversed.status, "paymentVoucher");
  assert.equal(reversed.paidCents, 6000);
  rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "2241")?.balanceCents, 6800);
  assert.equal(rows.find((row) => row.code === "1002")?.balanceCents, -6000);

  const statements = await listBankStatements(book.id);
  const restored = statements.find((row) => row.id === stmt.id);
  assert.equal(restored?.remainingCents, 6800);

  // 幂等
  const revAgain = await reverseAllocation(cashier, draft.id, lastAlloc.id, {
    expectedRevision: reversed.revision,
    mutationId: "m-rev-1",
    remark: "配错流水撤销",
  });
  assert.equal(revAgain.revision, reversed.revision);

  // 再撤第一笔，付清额归零后可作废
  const firstAlloc = reversed.allocations.find((row) => !row.reversedAt)!;
  const zeroPaid = await reverseAllocation(cashier, draft.id, firstAlloc.id, {
    expectedRevision: reversed.revision,
    mutationId: "m-rev-2",
    remark: "全部撤销",
  });
  assert.equal(zeroPaid.paidCents, 0);
  assert.equal(zeroPaid.status, "paymentVoucher");
  rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "2241")?.balanceCents, 12800);
  assert.equal(rows.find((row) => row.code === "1002")?.balanceCents, 0);

  const voidAfterPay = await applyClaimAction(gm, draft.id, {
    action: "void",
    expectedRevision: zeroPaid.revision,
    mutationId: "m-void-after-rev",
    remark: "匹配撤销后作废",
  });
  assert.equal(voidAfterPay.status, "voided");
  rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "5602")?.balanceCents, 0);
  assert.equal(rows.find((row) => row.code === "2241")?.balanceCents, 0);

  // 兼容旧全额付款接口
  const draft2 = await createDraft(employee, {
    bookId: book.id,
    department: "行政",
    costCenter: "公司公共",
    payeeName: "张三",
    payeeAccount: "6222",
    bankName: "测试银行",
    purpose: "兼容付款",
    occurredOn: "2026-10-04",
    items: [{ memo: "墨盒", cents: 5000, invoiceNo: `INV2-${suffix}` }],
  });
  await uploadClaimItemAttachment(employee, draft2.id, draft2.items[0]!.id, {
    fileName: "发票2.pdf",
    fileBase64: Buffer.from("x").toString("base64"),
  });
  await applyClaimAction(employee, draft2.id, { action: "submit", expectedRevision: 1, mutationId: "s2" });
  await applyClaimAction(finance, draft2.id, { action: "financeApprove", expectedRevision: 2, mutationId: "f2", remark: "ok" });
  await applyClaimAction(gm, draft2.id, { action: "gmApprove", expectedRevision: 3, mutationId: "g2", remark: "ok" });
  const full = await completePayment(cashier, draft2.id, {
    expectedRevision: 4,
    mutationId: "pay-full",
    voucherNo: `FULL-${suffix}`,
    paidOn: "2026-10-04",
    bankAccountCode: "1002",
    remark: "一次付清",
    fileName: "full.txt",
    fileBase64: Buffer.from("full").toString("base64"),
  });
  assert.equal(full.status, "completed");
  assert.equal(full.paidCents, 5000);
  rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "5602")?.balanceCents, 5000);
  assert.equal(rows.find((row) => row.code === "2241")?.balanceCents, 0);
  assert.equal(rows.find((row) => row.code === "1002")?.balanceCents, -5000);

  const recon = await bankReconciliation(book.id, "1002");
  assert.equal(recon.bookBalanceCents, -5000);
  assert.equal(recon.statementTotalCents, 12800 + 5000);
  assert.equal(recon.matchedCents, 5000);
  assert.equal(recon.unmatchedCents, 12800);
  assert.equal(recon.openPayableCents, 0);
  assert.equal(recon.unmatchedStatements.length, 1);
  assert.equal(recon.unmatchedStatements[0]?.remainingCents, 12800);

  console.log("claim+bank-match ok");
}

main();
