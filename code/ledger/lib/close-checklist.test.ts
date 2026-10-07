import assert from "node:assert/strict";
import { login } from "./auth";
import { createFixedAsset, depreciateMonth } from "./fixed-asset";
import { closePeriod, openBook, periodCloseChecklist } from "./ledger";

async function main() {
  const book = await openBook(`清单账-${Date.now().toString(36)}`);
  const financeLogin = await login({ username: "finance", password: "Passw0rd!" });
  assert.ok(financeLogin);
  const finance = {
    id: financeLogin.user.id,
    username: financeLogin.user.username,
    displayName: financeLogin.user.displayName,
    roles: financeLogin.user.roles,
  };

  await createFixedAsset(finance, book.id, {
    code: "FA-CL",
    name: "清单机",
    startOn: "2026-01-01",
    costCents: 120_000,
    residualRatePercent: 5,
    usefulMonths: 12,
    mutationId: "cl-fa-1",
  });

  const jan = await periodCloseChecklist(book.id, "2026-01");
  assert.equal(jan.ready, true);
  assert.equal(jan.closed, false);

  const febBlocked = await periodCloseChecklist(book.id, "2026-02");
  assert.equal(febBlocked.ready, false);
  assert.ok(febBlocked.gaps.some((g) => g.code === "OPEN_DEPRECIATION"));

  await depreciateMonth(finance, book.id, { yearMonth: "2026-02", mutationId: "cl-dep-02" });
  const febReady = await periodCloseChecklist(book.id, "2026-02");
  assert.equal(febReady.ready, true);

  await closePeriod(book.id, "2026-02", "财务李", "二月");
  const febClosed = await periodCloseChecklist(book.id, "2026-02");
  assert.equal(febClosed.closed, true);
  assert.ok(febClosed.gaps.some((g) => g.code === "ALREADY_CLOSED"));

  console.log("close-checklist.test.ts ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
