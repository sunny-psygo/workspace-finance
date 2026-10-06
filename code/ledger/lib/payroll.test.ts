import assert from "node:assert/strict";
import { calculateSalaryTax, MONTHLY_BASIC_DEDUCTION_CENTS } from "./payroll-tax";
import {
  allocatePayrollPayment,
  confirmPayrollTax,
  createPayrollBatch,
  postPayrollBatch,
  setPayrollLines,
} from "./payroll";
import { closePeriod, LedgerError, openBook, trialBalance } from "./ledger";
import { importBankStatement } from "./payment";
import { login } from "./auth";

async function main() {
  // 样例（1 月）：应发 10000、社保 1000、公积金 500 → 应纳税所得 3500 → 税 105
  // 若用 10 月且无前期累计，减除费用按 10×5000，本期税可为 0（累计预扣法正常现象）
  const tax = calculateSalaryTax({
    monthIndex: 1,
    grossCents: 1_000_000,
    employeeSiCents: 100_000,
    housingFundCents: 50_000,
    otherDeductionCents: 0,
    priorGrossCents: 0,
    priorSiCents: 0,
    priorHfCents: 0,
    priorTaxCents: 0,
  });
  assert.equal(MONTHLY_BASIC_DEDUCTION_CENTS, 500_000);
  assert.equal(tax.estimatedTaxCents, 10_500);
  assert.equal(tax.netCents, 839_500);

  const book = await openBook(`工资账-${Date.now().toString(36)}`);
  const hrLogin = await login({ username: "hr", password: "Passw0rd!" });
  const financeLogin = await login({ username: "finance", password: "Passw0rd!" });
  const cashierLogin = await login({ username: "cashier", password: "Passw0rd!" });
  assert.ok(hrLogin && financeLogin && cashierLogin);
  const hr = { id: hrLogin.user.id, username: hrLogin.user.username, displayName: hrLogin.user.displayName, roles: hrLogin.user.roles };
  const finance = { id: financeLogin.user.id, username: financeLogin.user.username, displayName: financeLogin.user.displayName, roles: financeLogin.user.roles };
  const cashier = { id: cashierLogin.user.id, username: cashierLogin.user.username, displayName: cashierLogin.user.displayName, roles: cashierLogin.user.roles };

  const batch = await createPayrollBatch(hr, book.id, {
    period: "2026-01",
    mutationId: "pb-create-1",
  });
  const withLines = await setPayrollLines(hr, batch.id, {
    expectedRevision: 0,
    mutationId: "pb-lines-1",
    lines: [
      {
        personCode: "E001",
        personName: "张三",
        grossCents: 1_000_000,
        employeeSiCents: 100_000,
        housingFundCents: 50_000,
      },
    ],
  });
  assert.equal(withLines.status, "calculated");
  assert.equal(withLines.taxCents, 10_500);
  assert.equal(withLines.netCents, 839_500);

  await assert.rejects(
    () => closePeriod(book.id, "2026-01", "财务李", "有工资"),
    (error: unknown) => error instanceof LedgerError && error.code === "PERIOD_HAS_OPEN_PAYROLL",
  );

  const verified = await confirmPayrollTax(finance, withLines.id, {
    expectedRevision: withLines.revision,
    mutationId: "pb-tax-1",
  });
  assert.equal(verified.status, "taxVerified");

  const posted = await postPayrollBatch(finance, verified.id, {
    expectedRevision: verified.revision,
    mutationId: "pb-post-1",
  });
  assert.equal(posted.status, "posted");
  assert.ok(posted.entryId);

  const rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "5602")?.balanceCents, 1_000_000);
  assert.equal(rows.find((row) => row.code === "2211")?.balanceCents, 839_500);
  assert.equal(rows.find((row) => row.code === "2221")?.balanceCents, 10_500);
  assert.equal(rows.find((row) => row.code === "2241")?.balanceCents, 150_000);

  const statement = await importBankStatement(cashier, book.id, {
    paidOn: "2026-01-25",
    cents: 839_500,
    bankAccountCode: "1002",
    reference: `PAY-${book.id.slice(0, 6)}`,
  });
  const paid = await allocatePayrollPayment(cashier, posted.id, {
    statementId: statement.id,
    cents: 839_500,
    expectedRevision: posted.revision,
    mutationId: "pb-pay-1",
  });
  assert.equal(paid.status, "paid");
  assert.equal(paid.paidCents, 839_500);

  await closePeriod(book.id, "2026-01", "财务李", "工资已付");
  console.log("payroll ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
