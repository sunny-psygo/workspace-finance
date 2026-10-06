import assert from "node:assert/strict";
import { calculateSalaryTax, MONTHLY_BASIC_DEDUCTION_CENTS } from "./payroll-tax";
import {
  allocatePayrollPayment,
  confirmPayrollTax,
  createPayrollBatch,
  importBureauTax,
  importBureauTaxFromCsv,
  PayrollError,
  postPayrollBatch,
  setPayrollLines,
  setPayrollLinesFromCsv,
  upsertOpeningTax,
} from "./payroll";
import { parseHrPayrollCsv, parseBureauTaxCsv } from "./payroll-csv";
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

  // 税局导入：差异无原因拒绝；有原因通过
  const book2 = await openBook(`税局账-${Date.now().toString(36)}`);
  const b2 = await createPayrollBatch(hr, book2.id, { period: "2026-01", mutationId: "tb-1" });
  const b2Lines = await setPayrollLines(hr, b2.id, {
    expectedRevision: 0,
    mutationId: "tb-lines",
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
  await assert.rejects(
    () =>
      importBureauTax(finance, b2Lines.id, {
        expectedRevision: b2Lines.revision,
        mutationId: "tb-bad",
        results: [{ personCode: "E001", bureauTaxCents: 12_000 }],
      }),
    (error: unknown) => error instanceof PayrollError && error.code === "PAYROLL_TAX_MISMATCH",
  );
  const verified2 = await importBureauTax(finance, b2Lines.id, {
    expectedRevision: b2Lines.revision,
    mutationId: "tb-ok",
    results: [{ personCode: "E001", bureauTaxCents: 12_000, reason: "扣缴端结果" }],
  });
  assert.equal(verified2.batch.status, "taxVerified");
  assert.equal(verified2.batch.taxCents, 12_000);
  assert.equal(verified2.batch.netCents, 838_000);
  assert.equal(verified2.batch.lines[0]?.bureauTaxCents, 12_000);

  // 期初累计：9 月前累计后，10 月试算带 prior
  const book3 = await openBook(`期初账-${Date.now().toString(36)}`);
  await upsertOpeningTax(finance, book3.id, {
    year: 2026,
    mutationId: "open-1",
    lines: [
      {
        personCode: "E001",
        personName: "张三",
        grossCents: 9_000_000,
        siCents: 900_000,
        hfCents: 450_000,
        taxCents: 90_000,
      },
    ],
  });
  const b3 = await createPayrollBatch(hr, book3.id, { period: "2026-10", mutationId: "ob-1" });
  const b3Lines = await setPayrollLines(hr, b3.id, {
    expectedRevision: 0,
    mutationId: "ob-lines",
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
  assert.equal(b3Lines.lines[0]?.priorGrossCents, 9_000_000);
  assert.equal(b3Lines.lines[0]?.priorTaxCents, 90_000);
  assert.ok((b3Lines.lines[0]?.estimatedTaxCents ?? 0) >= 0);

  // CSV：人事表 + 税局表
  const hrRows = parseHrPayrollCsv(`人员编号,姓名,应发,个人社保,个人公积金,其他扣款
E002,李四,"12,000.50",800,400,0
`);
  assert.equal(hrRows[0]?.grossCents, 1_200_050);
  assert.equal(hrRows[0]?.employeeSiCents, 80_000);

  const book4 = await openBook(`CSV账-${Date.now().toString(36)}`);
  const b4 = await createPayrollBatch(hr, book4.id, { period: "2026-01", mutationId: "csv-b" });
  const b4Lines = await setPayrollLinesFromCsv(hr, b4.id, {
    expectedRevision: 0,
    mutationId: "csv-lines",
    csv: `人员编号,姓名,应发,个人社保,个人公积金
E001,张三,10000,1000,500
`,
  });
  assert.equal(b4Lines.status, "calculated");
  assert.equal(b4Lines.taxCents, 10_500);
  const bureauRows = parseBureauTaxCsv(`人员编号,本期个税,差异原因
E001,120,扣缴端
`);
  assert.equal(bureauRows[0]?.bureauTaxCents, 12_000);
  const b4Tax = await importBureauTaxFromCsv(finance, b4Lines.id, {
    expectedRevision: b4Lines.revision,
    mutationId: "csv-tax",
    csv: `人员编号,本期个税,差异原因
E001,120,扣缴端
`,
  });
  assert.equal(b4Tax.batch.status, "taxVerified");
  assert.equal(b4Tax.batch.taxCents, 12_000);

  console.log("payroll ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
