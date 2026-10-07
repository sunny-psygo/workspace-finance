import assert from "node:assert/strict";
import { login } from "./auth";
import { getArchiveCase, listArchiveCases } from "./archive";
import { createFixedAsset, depreciateMonth } from "./fixed-asset";
import { openBook } from "./ledger";

async function main() {
  const book = await openBook(`档案账-${Date.now().toString(36)}`);
  const financeLogin = await login({ username: "finance", password: "Passw0rd!" });
  assert.ok(financeLogin);
  const finance = {
    id: financeLogin.user.id,
    username: financeLogin.user.username,
    displayName: financeLogin.user.displayName,
    roles: financeLogin.user.roles,
  };

  const asset = await createFixedAsset(finance, book.id, {
    code: "FA-ARC",
    name: "档案机",
    startOn: "2026-01-08",
    costCents: 120_000,
    residualRatePercent: 5,
    usefulMonths: 12,
    mutationId: "arc-fa-1",
  });
  const dep = await depreciateMonth(finance, book.id, {
    yearMonth: "2026-02",
    mutationId: "arc-dep-02",
  });
  assert.equal(dep.depreciated.length, 1);

  const feb = await listArchiveCases(book.id, { period: "2026-02" });
  assert.ok(feb.length >= 1);
  const depCase = feb.find((row) => row.reference?.startsWith("fa-dep:"));
  assert.ok(depCase);
  assert.ok(depCase!.references.some((r) => r.type === "fixedAssetDepreciation"));
  assert.equal(depCase!.debitCents, depCase!.creditCents);
  assert.match(depCase!.contentHash, /^[a-f0-9]{64}$/);

  const jan = await listArchiveCases(book.id, { period: "2026-01", keyword: "FA-ARC" });
  assert.ok(jan.some((row) => row.references.some((r) => r.id === asset.id)));

  const one = await getArchiveCase(book.id, asset.acquisitionEntryId);
  assert.ok(one);
  assert.equal(one!.entryId, asset.acquisitionEntryId);
  assert.ok(one!.references.some((r) => r.type === "fixedAsset"));

  console.log("archive.test.ts ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
