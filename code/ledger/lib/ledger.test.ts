import assert from "node:assert/strict";
import { addAccount, LedgerError, openBook, postEntry, trialBalance } from "./ledger";

async function main() {
  const book = await openBook("测试账");
  await addAccount(book.id, { code: "1001", name: "库存现金", kind: "asset" });
  await addAccount(book.id, { code: "5001", name: "管理费用", kind: "expense" });
  await postEntry(book.id, {
    occurredOn: "2026-10-03",
    memo: "办公费",
    reference: "claim-1",
    postings: [
      { accountCode: "5001", side: "debit", cents: 12800 },
      { accountCode: "1001", side: "credit", cents: 12800 },
    ],
  });
  const again = await postEntry(book.id, {
    occurredOn: "2026-10-03",
    memo: "办公费",
    reference: "claim-1",
    postings: [
      { accountCode: "5001", side: "debit", cents: 12800 },
      { accountCode: "1001", side: "credit", cents: 12800 },
    ],
  });
  assert.equal(again.reference, "claim-1");
  const rows = await trialBalance(book.id);
  assert.equal(rows.find((row) => row.code === "1001")?.balanceCents, -12800);
  assert.equal(rows.find((row) => row.code === "5001")?.balanceCents, 12800);
  await assert.rejects(
    () => postEntry(book.id, {
      occurredOn: "2026-10-03",
      memo: "不平衡",
      postings: [
        { accountCode: "5001", side: "debit", cents: 100 },
        { accountCode: "1001", side: "credit", cents: 90 },
      ],
    }),
    (error: unknown) => error instanceof LedgerError && error.code === "ENTRY_UNBALANCED",
  );
  console.log("ledger ok");
}

main();
