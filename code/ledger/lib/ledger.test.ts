import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  addAccount,
  closePeriod,
  closeYear,
  LedgerError,
  openBook,
  postEntry,
  reopenPeriod,
  reopenYear,
  trialBalance,
} from "./ledger";

async function main() {
  const book = await openBook(`测试账-${Date.now().toString(36)}`);
  const { db } = await import("./db");
  const seeded = await db.account.findMany({ where: { bookId: book.id }, orderBy: { code: "asc" } });
  assert.deepEqual(
    seeded.map((row) => row.code),
    ["1002", "2211", "2221", "2241", "4103", "4104", "5602"],
  );
  await addAccount(book.id, { code: "1001", name: "库存现金", kind: "asset" });
  await addAccount(book.id, { code: "5001", name: "管理费用手工", kind: "expense" });
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

  await closePeriod(book.id, "2026-09", "财务李", "九月结账");
  await assert.rejects(
    () => postEntry(book.id, {
      occurredOn: "2026-09-15",
      memo: "锁期测试",
      postings: [
        { accountCode: "5001", side: "debit", cents: 100 },
        { accountCode: "1001", side: "credit", cents: 100 },
      ],
    }),
    (error: unknown) => error instanceof LedgerError && error.code === "PERIOD_LOCKED",
  );

  await db.claim.create({
    data: {
      id: `open-${book.id.slice(0, 8)}`,
      bookId: book.id,
      status: "financeReview",
      revision: 2,
      applicant: "测",
      department: "行政",
      costCenter: "公司公共",
      payeeName: "测",
      payeeAccount: "1",
      bankName: "行",
      purpose: "挡结账",
      occurredOn: "2026-11-02",
      totalCents: 100,
    },
  });
  await assert.rejects(
    () => closePeriod(book.id, "2026-11", "财务李", "有未审单"),
    (error: unknown) => error instanceof LedgerError && error.code === "PERIOD_HAS_OPEN_CLAIMS",
  );

  await db.bankStatement.create({
    data: {
      id: `stmt-${book.id.slice(0, 8)}`,
      bookId: book.id,
      paidOn: "2026-12-01",
      cents: 1000,
      remainingCents: 1000,
      bankAccountCode: "1002",
      reference: `UNMATCH-${book.id.slice(0, 6)}`,
    },
  });
  await assert.rejects(
    () => closePeriod(book.id, "2026-12", "财务李", "有未匹配流水"),
    (error: unknown) => error instanceof LedgerError && error.code === "PERIOD_HAS_UNMATCHED_STATEMENTS",
  );
  await db.bankStatement.update({
    where: { id: `stmt-${book.id.slice(0, 8)}` },
    data: { voidedAt: new Date(), voidedBy: "财务李", voidRemark: "导错", remainingCents: 0 },
  });
  await closePeriod(book.id, "2026-12", "财务李", "作废后可结");
  await postEntry(book.id, {
    occurredOn: "2026-10-15",
    memo: "未锁月",
    reference: "open-oct",
    postings: [
      { accountCode: "5001", side: "debit", cents: 100 },
      { accountCode: "1001", side: "credit", cents: 100 },
    ],
  });
  await reopenPeriod(book.id, "2026-09", "补凭证");
  await postEntry(book.id, {
    occurredOn: "2026-09-16",
    memo: "反结账后",
    reference: "reopened-sep",
    postings: [
      { accountCode: "5001", side: "debit", cents: 50 },
      { accountCode: "1001", side: "credit", cents: 50 },
    ],
  });

  // 结转损益：只清当月发生额；九月的 50 分费用仍留在 5001
  await closePeriod(book.id, "2026-10", "财务李", "十月结账");
  const closedRows = await trialBalance(book.id);
  assert.equal(closedRows.find((row) => row.code === "5001")?.balanceCents, 50);
  assert.equal(closedRows.find((row) => row.code === "4103")?.balanceCents, -12900);
  await reopenPeriod(book.id, "2026-10", "改数");
  const reopenedRows = await trialBalance(book.id);
  assert.equal(reopenedRows.find((row) => row.code === "5001")?.balanceCents, 12950);
  assert.equal(reopenedRows.find((row) => row.code === "4103")?.balanceCents, 0);

  // 再结十月，并种满全年锁后做年末结转
  await closePeriod(book.id, "2026-10", "财务李", "再结十月");
  for (let month = 1; month <= 12; month += 1) {
    const yearMonth = `2026-${String(month).padStart(2, "0")}`;
    await db.accountingPeriod.upsert({
      where: { bookId_yearMonth: { bookId: book.id, yearMonth } },
      create: {
        id: randomUUID(),
        bookId: book.id,
        yearMonth,
        lockedBy: "财务李",
        remark: "种锁",
      },
      update: {},
    });
  }
  const yearClose = await closeYear(book.id, 2026, "财务李", "年结");
  assert.ok(yearClose.entryId);
  const yearRows = await trialBalance(book.id);
  assert.equal(yearRows.find((row) => row.code === "4103")?.balanceCents, 0);
  assert.equal(yearRows.find((row) => row.code === "4104")?.balanceCents, -12900);
  await reopenYear(book.id, 2026, "改年结");
  const yearReopened = await trialBalance(book.id);
  assert.equal(yearReopened.find((row) => row.code === "4103")?.balanceCents, -12900);
  assert.equal(yearReopened.find((row) => row.code === "4104")?.balanceCents, 0);

  console.log("ledger ok");
}

main();
