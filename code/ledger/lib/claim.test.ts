import assert from "node:assert/strict";
import { uploadClaimItemAttachment } from "./attachment";
import { createUser, login } from "./auth";
import { applyClaimAction, ClaimError, createDraft } from "./claim";
import { addAccount, openBook, trialBalance } from "./ledger";
import { completePayment } from "./payment";

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
  await addAccount(book.id, { code: "5602", name: "管理费用", kind: "expense" });
  await addAccount(book.id, { code: "2241", name: "其他应付款", kind: "liability" });
  await addAccount(book.id, { code: "1002", name: "银行存款", kind: "asset" });

  const draft = await createDraft(employee, {
    bookId: book.id,
    department: "行政",
    costCenter: "公司公共",
    payeeName: "张三",
    payeeAccount: "6222000000000001",
    bankName: "测试银行",
    purpose: "办公用品",
    occurredOn: "2026-10-04",
    items: [{ memo: "打印纸", cents: 12800, invoiceNo: " inv-2026-1004-001 " }],
  });
  assert.equal(draft.applicant, "张三");
  assert.equal(draft.status, "draft");
  assert.equal(draft.items[0]?.invoiceNo, "INV20261004001");

  await assert.rejects(
    () => applyClaimAction(employee, draft.id, {
      action: "submit",
      expectedRevision: 1,
      mutationId: "no-attach",
    }),
    (error: unknown) => error instanceof ClaimError && error.code === "CLAIM_ATTACHMENT_REQUIRED",
  );

  await assert.rejects(
    () => createDraft(employee, {
      bookId: book.id,
      department: "行政",
      costCenter: "公司公共",
      payeeName: "张三",
      payeeAccount: "6222000000000001",
      bankName: "测试银行",
      purpose: "重复发票",
      occurredOn: "2026-10-04",
      items: [
        { memo: "A", cents: 100, invoiceNo: "DUP-1" },
        { memo: "B", cents: 200, invoiceNo: "dup-1" },
      ],
    }),
    (error: unknown) => error instanceof ClaimError && error.code === "CLAIM_INVOICE_DUPLICATE",
  );

  const itemId = draft.items[0]!.id;
  const attachment = await uploadClaimItemAttachment(employee, draft.id, itemId, {
    fileName: "发票.pdf",
    contentType: "application/pdf",
    fileBase64: Buffer.from("%PDF-demo").toString("base64"),
  });
  assert.ok(attachment.id);
  assert.ok(attachment.storagePath.includes(draft.id));

  await assert.rejects(
    () => applyClaimAction(finance, draft.id, {
      action: "submit",
      expectedRevision: 1,
      mutationId: "bad-submit",
    }),
    (error: unknown) => error instanceof ClaimError && error.code === "CLAIM_FORBIDDEN",
  );

  const submitted = await applyClaimAction(employee, draft.id, {
    action: "submit",
    expectedRevision: 1,
    mutationId: "m-submit",
  });
  assert.equal(submitted.status, "financeReview");
  assert.equal(submitted.items[0]?.attachments.length, 1);

  await assert.rejects(
    () => createDraft(employee, {
      bookId: book.id,
      department: "行政",
      costCenter: "公司公共",
      payeeName: "张三",
      payeeAccount: "6222000000000001",
      bankName: "测试银行",
      purpose: "抢同一发票",
      occurredOn: "2026-10-04",
      items: [{ memo: "再报", cents: 100, invoiceNo: "INV-2026-1004-001" }],
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
  assert.ok(approved.entryId);

  await assert.rejects(
    () => completePayment(employee, draft.id, {
      expectedRevision: 4,
      mutationId: "bad-pay",
      voucherNo: "X",
      paidOn: "2026-10-04",
      bankAccountCode: "1002",
      remark: "不可",
      fileName: "a.txt",
      fileBase64: Buffer.from("no").toString("base64"),
    }),
    (error: unknown) => error instanceof ClaimError && error.code === "CLAIM_FORBIDDEN",
  );

  const paid = await completePayment(cashier, draft.id, {
    expectedRevision: 4,
    mutationId: "m-pay",
    voucherNo: "BANK20261004001",
    paidOn: "2026-10-04",
    bankAccountCode: "1002",
    remark: "已付",
    fileName: "receipt.txt",
    fileBase64: Buffer.from("payment-proof").toString("base64"),
  });
  assert.equal(paid.status, "completed");
  assert.ok(paid.paymentEntryId);
  assert.equal(paid.payment?.voucherNo, "BANK20261004001");

  const again = await completePayment(cashier, draft.id, {
    expectedRevision: 4,
    mutationId: "m-pay",
    voucherNo: "BANK20261004001",
    paidOn: "2026-10-04",
    bankAccountCode: "1002",
    remark: "已付",
    fileName: "receipt.txt",
    fileBase64: Buffer.from("payment-proof").toString("base64"),
  });
  assert.equal(again.revision, paid.revision);
  assert.equal(again.paymentEntryId, paid.paymentEntryId);

  const rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "5602")?.balanceCents, 12800);
  assert.equal(rows.find((row) => row.code === "2241")?.balanceCents, 0);
  assert.equal(rows.find((row) => row.code === "1002")?.balanceCents, -12800);

  console.log("claim+attachment+payment ok");
}

main();
