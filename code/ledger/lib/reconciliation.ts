import { ClaimError } from "./claim";
import { db } from "./db";
import { trialBalance } from "./ledger";

export async function bankReconciliation(bookId: string, bankAccountCode = "1002") {
  if (!bookId.trim()) throw new ClaimError("缺少账套。", "CLAIM_INVALID", "传入 bookId。");
  const code = bankAccountCode.trim() || "1002";

  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) throw new ClaimError("账套不存在。", "CLAIM_INVALID", "先开账。");

  const balances = await trialBalance(bookId);
  const bankRow = balances.find((row) => row.code === code);
  const bookBalanceCents = bankRow?.balanceCents ?? 0;

  const statements = await db.bankStatement.findMany({
    where: { bookId, bankAccountCode: code },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const statementTotalCents = statements.reduce((sum, row) => sum + row.cents, 0);
  const unmatchedCents = statements.reduce((sum, row) => sum + row.remainingCents, 0);
  const matchedCents = statementTotalCents - unmatchedCents;

  const unmatchedStatements = statements
    .filter((row) => row.remainingCents > 0)
    .map((row) => ({
      id: row.id,
      reference: row.reference,
      paidOn: row.paidOn,
      cents: row.cents,
      remainingCents: row.remainingCents,
      counterparty: row.counterparty,
    }));

  const openClaims = await db.claim.findMany({
    where: { bookId, status: "paymentVoucher" },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      purpose: true,
      payeeName: true,
      totalCents: true,
      paidCents: true,
      status: true,
      occurredOn: true,
    },
  });

  const openPayableCents = openClaims.reduce(
    (sum, row) => sum + Math.max(0, row.totalCents - row.paidCents),
    0,
  );

  return {
    bankAccountCode: code,
    bookBalanceCents,
    statementTotalCents,
    matchedCents,
    unmatchedCents,
    openPayableCents,
    unmatchedStatements,
    openClaims: openClaims.map((row) => ({
      id: row.id,
      purpose: row.purpose,
      payeeName: row.payeeName,
      totalCents: row.totalCents,
      paidCents: row.paidCents,
      unpaidCents: Math.max(0, row.totalCents - row.paidCents),
      occurredOn: row.occurredOn,
    })),
  };
}
