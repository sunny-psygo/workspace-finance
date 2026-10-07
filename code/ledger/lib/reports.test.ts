import assert from "node:assert/strict";
import { login } from "./auth";
import { createFixedAsset, depreciateMonth } from "./fixed-asset";
import { closePeriod, openBook, postEntry } from "./ledger";
import { balanceSheet, incomeStatement } from "./reports";

async function main() {
  const book = await openBook(`报表账-${Date.now().toString(36)}`);
  const financeLogin = await login({ username: "finance", password: "Passw0rd!" });
  assert.ok(financeLogin);
  const finance = {
    id: financeLogin.user.id,
    username: financeLogin.user.username,
    displayName: financeLogin.user.displayName,
    roles: financeLogin.user.roles,
  };

  await createFixedAsset(finance, book.id, {
    code: "FA-R1",
    name: "打印机",
    startOn: "2026-01-05",
    costCents: 120_000,
    residualRatePercent: 5,
    usefulMonths: 12,
    mutationId: "rpt-fa-1",
  });
  // 一笔费用便于利润表有数
  await postEntry(book.id, {
    occurredOn: "2026-01-20",
    memo: "办公费",
    reference: "rpt-exp-1",
    postings: [
      { accountCode: "5602", side: "debit", cents: 5_000 },
      { accountCode: "1002", side: "credit", cents: 5_000 },
    ],
  });

  const bsOpen = await balanceSheet(book.id);
  assert.equal(bsOpen.balanced, true);
  assert.equal(bsOpen.assets.find((r) => r.key === "fa-cost")?.cents, 120_000);
  assert.equal(bsOpen.assets.find((r) => r.key === "fa-accum")?.cents, 0);
  assert.equal(bsOpen.assets.find((r) => r.key === "fa-nbv")?.cents, 120_000);
  assert.equal(bsOpen.liabilities.find((r) => r.key === "2241")?.cents, 120_000);
  assert.equal(bsOpen.equity.find((r) => r.key === "unclosed-pl")?.cents, -5_000);

  const isJan = await incomeStatement(book.id, "2026-01");
  assert.equal(isJan.expenseTotalCents, 5_000);
  assert.equal(isJan.profitCents, -5_000);

  await closePeriod(book.id, "2026-01", "财务李", "一月");
  const bsClosed = await balanceSheet(book.id);
  assert.equal(bsClosed.balanced, true);
  assert.equal(bsClosed.equity.find((r) => r.key === "unclosed-pl")?.cents, 0);
  assert.equal(bsClosed.equity.find((r) => r.key === "4103")?.cents, -5_000);

  await depreciateMonth(finance, book.id, { yearMonth: "2026-02", mutationId: "rpt-dep-02" });
  const isFeb = await incomeStatement(book.id, "2026-02");
  assert.equal(isFeb.expenseTotalCents, 9_500);
  assert.equal(isFeb.profitCents, -9_500);

  const bsFeb = await balanceSheet(book.id);
  assert.equal(bsFeb.balanced, true);
  assert.equal(bsFeb.assets.find((r) => r.key === "fa-accum")?.cents, 9_500);
  assert.equal(bsFeb.assets.find((r) => r.key === "fa-nbv")?.cents, 110_500);

  console.log("reports.test.ts ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
