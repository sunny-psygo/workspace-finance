import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";

export const accountKinds = ["asset", "liability", "equity", "income", "expense"] as const;
export type AccountKind = (typeof accountKinds)[number];

type DbClient = PrismaClient | Prisma.TransactionClient;

const normalSide: Record<AccountKind, "debit" | "credit"> = {
  asset: "debit",
  expense: "debit",
  liability: "credit",
  equity: "credit",
  income: "credit",
};

export class LedgerError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly next: string,
  ) {
    super(message);
  }
}

const accountInput = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(accountKinds),
  parentCode: z.string().trim().min(1).max(32).optional(),
});

const postingInput = z.object({
  accountCode: z.string().trim().min(1),
  side: z.enum(["debit", "credit"]),
  cents: z.number().int().positive(),
});

const entryInput = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().trim().min(1).max(200),
  reference: z.string().trim().min(1).max(80).optional(),
  postings: z.array(postingInput).min(2),
});

export type AccountInput = z.infer<typeof accountInput>;
export type EntryInput = z.infer<typeof entryInput>;

export function yearMonthOf(occurredOn: string) {
  return occurredOn.slice(0, 7);
}

async function assertPeriodOpen(bookId: string, occurredOn: string, client: DbClient) {
  const yearMonth = yearMonthOf(occurredOn);
  const locked = await client.accountingPeriod.findUnique({
    where: { bookId_yearMonth: { bookId, yearMonth } },
  });
  if (locked) {
    throw new LedgerError(
      `会计期间 ${yearMonth} 已结账，不能再过账。`,
      "PERIOD_LOCKED",
      "改到未锁月份，或由财务反结账后再试。",
    );
  }
}

export async function listPeriods(bookId: string) {
  return db.accountingPeriod.findMany({
    where: { bookId },
    orderBy: { yearMonth: "desc" },
  });
}

function lastDayOfMonth(yearMonth: string) {
  const [yearText, monthText] = yearMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${yearMonth}-${String(day).padStart(2, "0")}`;
}

/** 该月收入/费用科目发生额（按正常余额方向净额；正数表示有余额需结转）。 */
async function monthPlMovements(bookId: string, yearMonth: string, client: DbClient = db) {
  const accounts = await client.account.findMany({
    where: { bookId, kind: { in: ["income", "expense"] } },
    include: {
      postings: {
        where: { entry: { occurredOn: { startsWith: `${yearMonth}-` } } },
      },
    },
    orderBy: { code: "asc" },
  });
  return accounts
    .map((account) => {
      const debit = account.postings
        .filter((line) => line.side === "debit")
        .reduce((sum, line) => sum + line.cents, 0);
      const credit = account.postings
        .filter((line) => line.side === "credit")
        .reduce((sum, line) => sum + line.cents, 0);
      const net = account.normal === "debit" ? debit - credit : credit - debit;
      return { code: account.code, kind: account.kind as "income" | "expense", netCents: net };
    })
    .filter((row) => row.netCents !== 0);
}

export async function closePeriod(bookId: string, yearMonth: string, lockedBy: string, remark = "") {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new LedgerError("期间格式应为 YYYY-MM。", "PERIOD_INVALID", "例如 2026-09。");
  }
  const existing = await db.accountingPeriod.findUnique({
    where: { bookId_yearMonth: { bookId, yearMonth } },
  });
  if (existing) return existing;

  const openClaims = await db.claim.findMany({
    where: {
      bookId,
      occurredOn: { startsWith: `${yearMonth}-` },
      status: { in: ["financeReview", "gmReview", "paymentVoucher"] },
    },
    select: { id: true, status: true, purpose: true },
    take: 20,
  });
  if (openClaims.length) {
    const detail = openClaims.map((row) => `${row.id.slice(0, 8)}:${row.status}`).join("、");
    throw new LedgerError(
      `期间 ${yearMonth} 仍有未完成单据：${detail}。`,
      "PERIOD_HAS_OPEN_CLAIMS",
      "先审批完或付完这些单，再结账。",
    );
  }

  const unmatchedStatements = await db.bankStatement.findMany({
    where: {
      bookId,
      paidOn: { startsWith: `${yearMonth}-` },
      remainingCents: { gt: 0 },
      voidedAt: null,
    },
    select: { id: true, reference: true, remainingCents: true },
    take: 20,
  });
  if (unmatchedStatements.length) {
    const detail = unmatchedStatements
      .map((row) => `${row.reference}:${row.remainingCents}分`)
      .join("、");
    throw new LedgerError(
      `期间 ${yearMonth} 仍有未匹配银行流水：${detail}。`,
      "PERIOD_HAS_UNMATCHED_STATEMENTS",
      "先匹配或撤销多余流水，再结账。",
    );
  }

  await ensureDefaultAccounts(bookId);

  return db.$transaction(async (tx) => {
    const movements = await monthPlMovements(bookId, yearMonth, tx);
    if (movements.length) {
      const postings: Array<{ accountCode: string; side: "debit" | "credit"; cents: number }> = [];
      let profitDebit = 0;
      let profitCredit = 0;
      for (const row of movements) {
        if (row.kind === "expense") {
          if (row.netCents > 0) {
            postings.push({ accountCode: row.code, side: "credit", cents: row.netCents });
            profitDebit += row.netCents;
          } else {
            const cents = Math.abs(row.netCents);
            postings.push({ accountCode: row.code, side: "debit", cents });
            profitCredit += cents;
          }
        } else {
          if (row.netCents > 0) {
            postings.push({ accountCode: row.code, side: "debit", cents: row.netCents });
            profitCredit += row.netCents;
          } else {
            const cents = Math.abs(row.netCents);
            postings.push({ accountCode: row.code, side: "credit", cents });
            profitDebit += cents;
          }
        }
      }
      if (profitDebit > profitCredit) {
        postings.push({ accountCode: "4103", side: "debit", cents: profitDebit - profitCredit });
      } else if (profitCredit > profitDebit) {
        postings.push({ accountCode: "4103", side: "credit", cents: profitCredit - profitDebit });
      }
      await postEntry(
        bookId,
        {
          occurredOn: lastDayOfMonth(yearMonth),
          memo: `${yearMonth} 结转损益`,
          reference: `pl-close:${yearMonth}`,
          postings,
        },
        tx,
      );
    }

    return tx.accountingPeriod.create({
      data: {
        id: randomUUID(),
        bookId,
        yearMonth,
        lockedBy,
        remark,
      },
    });
  });
}

export async function reopenPeriod(bookId: string, yearMonth: string, remark: string) {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new LedgerError("期间格式应为 YYYY-MM。", "PERIOD_INVALID", "例如 2026-09。");
  }
  if (!remark.trim()) {
    throw new LedgerError("反结账必须填写原因。", "PERIOD_INVALID", "在 remark 写原因。");
  }

  await db.$transaction(async (tx) => {
    const result = await tx.accountingPeriod.deleteMany({ where: { bookId, yearMonth } });
    if (result.count !== 1) {
      throw new LedgerError(`期间 ${yearMonth} 未锁定。`, "PERIOD_INVALID", "无需反结账。");
    }

    const closing = await tx.entry.findUnique({
      where: { bookId_reference: { bookId, reference: `pl-close:${yearMonth}` } },
      include: { postings: { include: { account: true } } },
    });
    if (!closing) return;

    const reverseRef = `pl-reopen:${yearMonth}`;
    const existingReverse = await tx.entry.findUnique({
      where: { bookId_reference: { bookId, reference: reverseRef } },
    });
    if (existingReverse) return;

    await postEntry(
      bookId,
      {
        occurredOn: closing.occurredOn,
        memo: `${yearMonth} 反结账红冲损益`,
        reference: reverseRef,
        postings: closing.postings.map((line) => ({
          accountCode: line.account.code,
          side: line.side === "debit" ? "credit" : "debit",
          cents: line.cents,
        })),
      },
      tx,
    );
  });
}

const defaultAccounts: AccountInput[] = [
  { code: "1002", name: "银行存款", kind: "asset" },
  { code: "2241", name: "其他应付款", kind: "liability" },
  { code: "4103", name: "本年利润", kind: "equity" },
  { code: "5602", name: "管理费用", kind: "expense" },
];

export async function ensureDefaultAccounts(bookId: string) {
  for (const account of defaultAccounts) {
    const existing = await db.account.findUnique({
      where: { bookId_code: { bookId, code: account.code } },
    });
    if (!existing) await addAccount(bookId, account);
  }
}

export async function openBook(name: string, currency = "CNY") {
  const trimmed = name.trim();
  if (!trimmed) throw new LedgerError("账套名称是空的。", "BOOK_NAME_REQUIRED", "传入非空名称。");
  const book = await db.book.create({ data: { id: randomUUID(), name: trimmed, currency } });
  await ensureDefaultAccounts(book.id);
  return book;
}

export async function addAccount(bookId: string, input: AccountInput) {
  const parsed = accountInput.safeParse(input);
  if (!parsed.success) {
    throw new LedgerError("账户字段不合要求。", "ACCOUNT_INVALID", parsed.error.issues.map((issue) => issue.message).join("；"));
  }
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) throw new LedgerError("账套不存在。", "BOOK_NOT_FOUND", "先调用 openBook，再用返回的 id。");
  const parent = parsed.data.parentCode
    ? await db.account.findUnique({ where: { bookId_code: { bookId, code: parsed.data.parentCode } } })
    : null;
  if (parsed.data.parentCode && !parent) {
    throw new LedgerError(`上级账户 ${parsed.data.parentCode} 不存在。`, "PARENT_NOT_FOUND", "先建立上级账户，或去掉 parentCode。");
  }
  return db.account.create({
    data: {
      id: randomUUID(),
      bookId,
      code: parsed.data.code,
      name: parsed.data.name,
      kind: parsed.data.kind,
      parentId: parent?.id,
      normal: normalSide[parsed.data.kind],
    },
  });
}

export async function postEntry(bookId: string, input: EntryInput, client: DbClient = db) {
  const parsed = entryInput.safeParse(input);
  if (!parsed.success) {
    throw new LedgerError("分录字段不合要求。", "ENTRY_INVALID", parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"));
  }
  const data = parsed.data;
  const debit = data.postings.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.cents, 0);
  const credit = data.postings.filter((line) => line.side === "credit").reduce((sum, line) => sum + line.cents, 0);
  if (debit !== credit) {
    throw new LedgerError(
      `借贷不平衡：借方 ${debit} 分，贷方 ${credit} 分。`,
      "ENTRY_UNBALANCED",
      "调整分录，使同一分录的借方合计等于贷方合计。",
    );
  }
  if (data.reference) {
    const existing = await client.entry.findUnique({
      where: { bookId_reference: { bookId, reference: data.reference } },
      include: { postings: true },
    });
    if (existing) return existing;
  }
  await assertPeriodOpen(bookId, data.occurredOn, client);
  const codes = [...new Set(data.postings.map((line) => line.accountCode))];
  const accounts = await client.account.findMany({ where: { bookId, code: { in: codes } } });
  const byCode = new Map(accounts.map((account) => [account.code, account]));
  const missing = codes.filter((code) => !byCode.has(code));
  if (missing.length) {
    throw new LedgerError(`账户不存在：${missing.join("、")}。`, "ACCOUNT_NOT_FOUND", "先用 addAccount 建立这些账户。");
  }
  return client.entry.create({
    data: {
      id: randomUUID(),
      bookId,
      occurredOn: data.occurredOn,
      memo: data.memo,
      reference: data.reference,
      postings: {
        create: data.postings.map((line) => ({
          id: randomUUID(),
          accountId: byCode.get(line.accountCode)!.id,
          side: line.side,
          cents: line.cents,
        })),
      },
    },
    include: { postings: true },
  });
}

export async function trialBalance(bookId: string) {
  const accounts = await db.account.findMany({
    where: { bookId },
    include: { postings: true },
    orderBy: { code: "asc" },
  });
  return accounts.map((account) => {
    const debit = account.postings.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.cents, 0);
    const credit = account.postings.filter((line) => line.side === "credit").reduce((sum, line) => sum + line.cents, 0);
    const signed = account.normal === "debit" ? debit - credit : credit - debit;
    return {
      code: account.code,
      name: account.name,
      kind: account.kind,
      normal: account.normal,
      debitCents: debit,
      creditCents: credit,
      balanceCents: signed,
    };
  });
}
