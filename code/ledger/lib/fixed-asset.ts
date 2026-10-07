import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AuthUser, userHasAnyRole } from "./auth";
import { db } from "./db";
import { ensureDefaultAccounts, postEntry, yearMonthOf } from "./ledger";

export class FixedAssetError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly next: string,
  ) {
    super(message);
  }
}

const createInput = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  startOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  costCents: z.number().int().positive(),
  residualRatePercent: z.number().int().min(0).max(100).default(5),
  usefulMonths: z.number().int().min(1).max(600),
  mutationId: z.string().trim().min(1).max(120),
  remark: z.string().trim().max(200).optional().default(""),
});

const depreciateInput = z.object({
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  mutationId: z.string().trim().min(1).max(120),
});

const disposeInput = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mutationId: z.string().trim().min(1).max(120),
  remark: z.string().trim().min(1).max(200),
});

export type CreateFixedAssetInput = z.input<typeof createInput>;
export type DepreciateMonthInput = z.input<typeof depreciateInput>;
export type DisposeFixedAssetInput = z.input<typeof disposeInput>;

function assertFinance(user: AuthUser) {
  if (!userHasAnyRole(user, ["finance", "gm"])) {
    throw new FixedAssetError("需要财务权限。", "ASSET_FORBIDDEN", "换 finance 账号。");
  }
}

function addMonths(yearMonth: string, delta: number) {
  const [y, m] = yearMonth.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function firstDepreciationMonth(startOn: string) {
  return addMonths(yearMonthOf(startOn), 1);
}

export function depreciableBaseCents(costCents: number, residualRatePercent: number) {
  return Math.floor((costCents * (100 - residualRatePercent)) / 100);
}

/** 第 periodIndex 期（从 1 起）应提金额；最后一期吸收尾差。 */
export function depreciationCentsForPeriod(
  costCents: number,
  residualRatePercent: number,
  usefulMonths: number,
  periodIndex: number,
) {
  if (periodIndex < 1 || periodIndex > usefulMonths) return 0;
  const base = depreciableBaseCents(costCents, residualRatePercent);
  const regular = Math.floor(base / usefulMonths);
  if (periodIndex < usefulMonths) return regular;
  return base - regular * (usefulMonths - 1);
}

function assertFinanceMutation(user: AuthUser) {
  assertFinance(user);
}

export async function listFixedAssets(bookId: string) {
  return db.fixedAsset.findMany({
    where: { bookId },
    include: { depreciations: { orderBy: { yearMonth: "asc" } } },
    orderBy: { code: "asc" },
  });
}

export async function listAssetsDueForDepreciation(bookId: string, yearMonth: string) {
  const assets = await db.fixedAsset.findMany({
    where: { bookId, status: "active" },
    include: { depreciations: true },
  });
  return assets.filter((asset) => {
    const first = firstDepreciationMonth(asset.startOn);
    if (yearMonth < first) return false;
    const done = asset.depreciations.length;
    if (done >= asset.usefulMonths) return false;
    if (asset.depreciations.some((row) => row.yearMonth === yearMonth)) return false;
    const expectedMonth = addMonths(first, done);
    return expectedMonth === yearMonth;
  });
}

export async function createFixedAsset(
  user: AuthUser,
  bookId: string,
  input: CreateFixedAssetInput,
) {
  assertFinanceMutation(user);
  const parsed = createInput.safeParse(input);
  if (!parsed.success) {
    throw new FixedAssetError(
      "资产字段不合要求。",
      "ASSET_INVALID",
      parsed.error.issues.map((issue) => issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) throw new FixedAssetError("账套不存在。", "ASSET_INVALID", "先开账。");

  const existingByMutation = await db.entry.findUnique({
    where: { bookId_reference: { bookId, reference: `fa-acq:${data.mutationId}` } },
  });
  if (existingByMutation) {
    const asset = await db.fixedAsset.findFirst({
      where: { bookId, acquisitionEntryId: existingByMutation.id },
      include: { depreciations: true },
    });
    if (asset) return asset;
  }

  await ensureDefaultAccounts(bookId);
  const entry = await postEntry(bookId, {
    occurredOn: data.startOn,
    memo: data.remark?.trim() || `购置 ${data.name}`,
    reference: `fa-acq:${data.mutationId}`,
    postings: [
      { accountCode: "1601", side: "debit", cents: data.costCents },
      { accountCode: "2241", side: "credit", cents: data.costCents },
    ],
  });

  try {
    return await db.fixedAsset.create({
      data: {
        id: randomUUID(),
        bookId,
        code: data.code,
        name: data.name,
        startOn: data.startOn,
        costCents: data.costCents,
        residualRatePercent: data.residualRatePercent,
        usefulMonths: data.usefulMonths,
        status: "active",
        accumDepCents: 0,
        acquisitionEntryId: entry.id,
        createdBy: user.displayName,
      },
      include: { depreciations: true },
    });
  } catch (error) {
    throw new FixedAssetError(
      `资产编号 ${data.code} 可能已存在。`,
      "ASSET_INVALID",
      "换编号或核对后重试。",
    );
  }
}

export async function depreciateMonth(
  user: AuthUser,
  bookId: string,
  input: DepreciateMonthInput,
) {
  assertFinanceMutation(user);
  const parsed = depreciateInput.safeParse(input);
  if (!parsed.success) {
    throw new FixedAssetError(
      "折旧字段不合要求。",
      "ASSET_INVALID",
      parsed.error.issues.map((issue) => issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const due = await listAssetsDueForDepreciation(bookId, data.yearMonth);
  if (!due.length) {
    return { yearMonth: data.yearMonth, depreciated: [] as Awaited<ReturnType<typeof listFixedAssets>> };
  }

  await ensureDefaultAccounts(bookId);
  const occurredOn = `${data.yearMonth}-28`;
  const depreciated = [];

  for (const asset of due) {
    const periodIndex = asset.depreciations.length + 1;
    const cents = depreciationCentsForPeriod(
      asset.costCents,
      asset.residualRatePercent,
      asset.usefulMonths,
      periodIndex,
    );
    if (cents <= 0) continue;

    const reference = `fa-dep:${asset.id}:${data.yearMonth}`;
    const existing = await db.fixedAssetDepreciation.findUnique({
      where: { assetId_yearMonth: { assetId: asset.id, yearMonth: data.yearMonth } },
    });
    if (existing) {
      depreciated.push(await db.fixedAsset.findUniqueOrThrow({
        where: { id: asset.id },
        include: { depreciations: true },
      }));
      continue;
    }

    const entry = await postEntry(bookId, {
      occurredOn,
      memo: `${asset.code} ${data.yearMonth} 折旧`,
      reference,
      postings: [
        { accountCode: "5602", side: "debit", cents },
        { accountCode: "1602", side: "credit", cents },
      ],
    });

    await db.$transaction(async (tx) => {
      await tx.fixedAssetDepreciation.create({
        data: {
          id: randomUUID(),
          assetId: asset.id,
          yearMonth: data.yearMonth,
          cents,
          entryId: entry.id,
        },
      });
      await tx.fixedAsset.update({
        where: { id: asset.id },
        data: { accumDepCents: { increment: cents } },
      });
    });

    depreciated.push(
      await db.fixedAsset.findUniqueOrThrow({
        where: { id: asset.id },
        include: { depreciations: true },
      }),
    );
  }

  return { yearMonth: data.yearMonth, depreciated };
}

export async function disposeFixedAsset(
  user: AuthUser,
  assetId: string,
  input: DisposeFixedAssetInput,
) {
  assertFinanceMutation(user);
  const parsed = disposeInput.safeParse(input);
  if (!parsed.success) {
    throw new FixedAssetError(
      "处置字段不合要求。",
      "ASSET_INVALID",
      parsed.error.issues.map((issue) => issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const asset = await db.fixedAsset.findUnique({
    where: { id: assetId },
    include: { depreciations: true },
  });
  if (!asset) throw new FixedAssetError("资产不存在。", "ASSET_INVALID", "核对 id。");
  if (asset.status !== "active") return asset;

  const disposeMonth = yearMonthOf(data.occurredOn);
  const due = await listAssetsDueForDepreciation(asset.bookId, disposeMonth);
  if (due.some((row) => row.id === asset.id)) {
    await depreciateMonth(user, asset.bookId, {
      yearMonth: disposeMonth,
      mutationId: `${data.mutationId}-pre-dep`,
    });
  }

  const fresh = await db.fixedAsset.findUniqueOrThrow({
    where: { id: assetId },
    include: { depreciations: true },
  });
  const nbv = fresh.costCents - fresh.accumDepCents;
  const postings: Array<{ accountCode: string; side: "debit" | "credit"; cents: number }> = [
    { accountCode: "1601", side: "credit", cents: fresh.costCents },
  ];
  if (fresh.accumDepCents > 0) {
    postings.push({ accountCode: "1602", side: "debit", cents: fresh.accumDepCents });
  }
  if (nbv > 0) {
    postings.push({ accountCode: "5602", side: "debit", cents: nbv });
  }

  await ensureDefaultAccounts(fresh.bookId);
  const entry = await postEntry(fresh.bookId, {
    occurredOn: data.occurredOn,
    memo: data.remark.trim(),
    reference: `fa-dispose:${data.mutationId}`,
    postings,
  });

  return db.fixedAsset.update({
    where: { id: fresh.id },
    data: {
      status: "disposed",
      disposedAt: new Date(),
      disposeEntryId: entry.id,
      disposeRemark: data.remark.trim(),
    },
    include: { depreciations: true },
  });
}
