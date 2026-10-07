import assert from "node:assert/strict";
import { login } from "./auth";
import {
  createFixedAsset,
  depreciateMonth,
  depreciationCentsForPeriod,
  disposeFixedAsset,
  firstDepreciationMonth,
  listAssetsDueForDepreciation,
} from "./fixed-asset";
import { closePeriod, LedgerError, openBook, trialBalance } from "./ledger";

async function main() {
  assert.equal(firstDepreciationMonth("2026-01-15"), "2026-02");
  // 成本 1200 元、残值 5%、12 期 → 可折旧 1140 元；前 11 期各 95 元，末月吃尾差
  assert.equal(depreciationCentsForPeriod(120_000, 5, 12, 1), 9_500);
  assert.equal(depreciationCentsForPeriod(120_000, 5, 12, 11), 9_500);
  assert.equal(depreciationCentsForPeriod(120_000, 5, 12, 12), 9_500);
  assert.equal(
    Array.from({ length: 12 }, (_, i) => depreciationCentsForPeriod(120_000, 5, 12, i + 1)).reduce(
      (a, b) => a + b,
      0,
    ),
    114_000,
  );

  const book = await openBook(`资产账-${Date.now().toString(36)}`);
  const financeLogin = await login({ username: "finance", password: "Passw0rd!" });
  assert.ok(financeLogin);
  const finance = {
    id: financeLogin.user.id,
    username: financeLogin.user.username,
    displayName: financeLogin.user.displayName,
    roles: financeLogin.user.roles,
  };

  const asset = await createFixedAsset(finance, book.id, {
    code: "FA-001",
    name: "办公电脑",
    startOn: "2026-01-10",
    costCents: 120_000,
    residualRatePercent: 5,
    usefulMonths: 12,
    mutationId: "fa-create-1",
  });
  assert.equal(asset.status, "active");
  assert.equal(asset.accumDepCents, 0);

  const again = await createFixedAsset(finance, book.id, {
    code: "FA-001",
    name: "办公电脑",
    startOn: "2026-01-10",
    costCents: 120_000,
    residualRatePercent: 5,
    usefulMonths: 12,
    mutationId: "fa-create-1",
  });
  assert.equal(again.id, asset.id);

  const tbAcq = await trialBalance(book.id);
  assert.equal(tbAcq.find((row) => row.code === "1601")?.balanceCents, 120_000);
  assert.equal(tbAcq.find((row) => row.code === "2241")?.balanceCents, 120_000);

  // 启用当月不应提
  assert.equal((await listAssetsDueForDepreciation(book.id, "2026-01")).length, 0);
  await closePeriod(book.id, "2026-01", "财务李", "一月无折旧");

  // 二月应提未提 → 结账阻断
  assert.equal((await listAssetsDueForDepreciation(book.id, "2026-02")).length, 1);
  await assert.rejects(
    () => closePeriod(book.id, "2026-02", "财务李", "漏折旧"),
    (error: unknown) => error instanceof LedgerError && error.code === "PERIOD_HAS_OPEN_DEPRECIATION",
  );

  const dep = await depreciateMonth(finance, book.id, {
    yearMonth: "2026-02",
    mutationId: "fa-dep-2026-02",
  });
  assert.equal(dep.depreciated.length, 1);
  assert.equal(dep.depreciated[0].accumDepCents, 9_500);
  assert.equal(dep.depreciated[0].depreciations.length, 1);

  const depAgain = await depreciateMonth(finance, book.id, {
    yearMonth: "2026-02",
    mutationId: "fa-dep-2026-02-b",
  });
  assert.equal(depAgain.depreciated.length, 0);

  const tbDep = await trialBalance(book.id);
  assert.equal(tbDep.find((row) => row.code === "5602")?.balanceCents, 9_500);
  // 1602 为资产类借方科目，贷记后余额为负（备抵）
  assert.equal(tbDep.find((row) => row.code === "1602")?.balanceCents, -9_500);

  await closePeriod(book.id, "2026-02", "财务李", "二月已折旧");

  // 处置当月先提后处置
  const disposed = await disposeFixedAsset(finance, asset.id, {
    occurredOn: "2026-03-20",
    mutationId: "fa-dispose-1",
    remark: "报废",
  });
  assert.equal(disposed.status, "disposed");
  assert.equal(disposed.accumDepCents, 19_000);
  assert.equal(disposed.depreciations.length, 2);

  const tbDisp = await trialBalance(book.id);
  assert.equal(tbDisp.find((row) => row.code === "1601")?.balanceCents, 0);
  assert.equal(tbDisp.find((row) => row.code === "1602")?.balanceCents, 0);
  // 一月无费用；二月结转已清；三月折旧 9500 + 净值损失 101000 = 110500
  assert.equal(tbDisp.find((row) => row.code === "5602")?.balanceCents, 110_500);

  assert.equal((await listAssetsDueForDepreciation(book.id, "2026-04")).length, 0);

  console.log("fixed-asset.test.ts ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
