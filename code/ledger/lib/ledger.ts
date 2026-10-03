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

export async function openBook(name: string, currency = "CNY") {
  const trimmed = name.trim();
  if (!trimmed) throw new LedgerError("账套名称是空的。", "BOOK_NAME_REQUIRED", "传入非空名称。");
  return db.book.create({ data: { id: randomUUID(), name: trimmed, currency } });
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
