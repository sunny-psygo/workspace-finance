import { createHash } from "node:crypto";
import { db } from "./db";

export type ArchiveAttachment = {
  id: string;
  documentType: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  storagePath: string;
};

export type ArchiveReference = {
  type: string;
  id: string;
  label: string;
};

export type ArchiveCase = {
  id: string;
  entryId: string;
  period: string;
  displayNumber: string;
  reference: string | null;
  occurredOn: string;
  memo: string;
  debitCents: number;
  creditCents: number;
  contentHash: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    side: string;
    cents: number;
  }>;
  references: ArchiveReference[];
  attachments: ArchiveAttachment[];
};

type EntryRow = {
  id: string;
  occurredOn: string;
  memo: string;
  reference: string | null;
  postings: Array<{
    side: string;
    cents: number;
    account: { code: string; name: string };
  }>;
};

function periodOf(occurredOn: string) {
  return occurredOn.slice(0, 7);
}

function displayNumber(period: string, reference: string | null, entryId: string) {
  const raw = (reference || entryId.slice(0, 8)).replace(/\s+/g, "");
  return `${period}-${raw}`;
}

function contentHash(input: {
  occurredOn: string;
  memo: string;
  reference: string | null;
  lines: Array<{ accountCode: string; side: string; cents: number }>;
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function pushUnique<T extends { type?: string; id: string }>(
  list: T[],
  item: T,
  keyOf: (row: T) => string = (row) => `${row.type ?? ""}:${row.id}`,
) {
  if (!list.some((row) => keyOf(row) === keyOf(item))) list.push(item);
}

/** 一次批量加载业务引用，避免按 Entry 循环查询。 */
async function loadSideData(entryIds: string[]) {
  if (!entryIds.length) {
    return {
      claims: [] as Awaited<ReturnType<typeof db.claim.findMany>>,
      payrollBatches: [] as Awaited<ReturnType<typeof db.payrollBatch.findMany>>,
      payrollPays: [] as Awaited<ReturnType<typeof db.payrollPaymentAllocation.findMany>>,
      assets: [] as Awaited<ReturnType<typeof db.fixedAsset.findMany>>,
      deps: [] as Awaited<ReturnType<typeof db.fixedAssetDepreciation.findMany>>,
    };
  }

  const [claims, payrollBatches, payrollPays, assets, deps] = await Promise.all([
    db.claim.findMany({
      where: { OR: [{ entryId: { in: entryIds } }, { paymentEntryId: { in: entryIds } }] },
      include: {
        items: { include: { attachments: true } },
        allocations: true,
      },
    }),
    db.payrollBatch.findMany({ where: { entryId: { in: entryIds } } }),
    db.payrollPaymentAllocation.findMany({
      where: { OR: [{ entryId: { in: entryIds } }, { reverseEntryId: { in: entryIds } }] },
    }),
    db.fixedAsset.findMany({
      where: { OR: [{ acquisitionEntryId: { in: entryIds } }, { disposeEntryId: { in: entryIds } }] },
    }),
    db.fixedAssetDepreciation.findMany({
      where: { entryId: { in: entryIds } },
      include: { asset: true },
    }),
  ]);

  return { claims, payrollBatches, payrollPays, assets, deps };
}

function enrichEntry(
  entry: EntryRow,
  side: Awaited<ReturnType<typeof loadSideData>>,
): ArchiveCase {
  const period = periodOf(entry.occurredOn);
  const lines = entry.postings.map((line) => ({
    accountCode: line.account.code,
    accountName: line.account.name,
    side: line.side,
    cents: line.cents,
  }));
  const debitCents = lines.filter((l) => l.side === "debit").reduce((s, l) => s + l.cents, 0);
  const creditCents = lines.filter((l) => l.side === "credit").reduce((s, l) => s + l.cents, 0);

  const references: ArchiveReference[] = [];
  const attachments: ArchiveAttachment[] = [];

  for (const claim of side.claims) {
    if (claim.entryId !== entry.id && claim.paymentEntryId !== entry.id) continue;
    pushUnique(references, {
      type: "claim",
      id: claim.id,
      label: `${claim.purpose}（${claim.status}）`,
    });
    for (const item of claim.items) {
      if (item.invoiceNo) {
        pushUnique(references, { type: "invoice", id: item.invoiceNo, label: item.invoiceNo });
      }
      for (const file of item.attachments) {
        pushUnique(
          attachments,
          {
            id: file.id,
            documentType: "claimAttachment",
            fileName: file.fileName,
            contentType: file.contentType,
            byteSize: file.byteSize,
            storagePath: file.storagePath,
          },
          (row) => row.id,
        );
      }
    }
    for (const alloc of claim.allocations) {
      if (alloc.entryId !== entry.id && alloc.reverseEntryId !== entry.id) continue;
      if (alloc.voucherNo) {
        pushUnique(references, {
          type: "paymentVoucher",
          id: alloc.voucherNo,
          label: alloc.voucherNo,
        });
      }
      if (alloc.storagePath && alloc.fileName) {
        pushUnique(
          attachments,
          {
            id: alloc.id,
            documentType: "paymentVoucher",
            fileName: alloc.fileName,
            contentType: "application/octet-stream",
            byteSize: 0,
            storagePath: alloc.storagePath,
          },
          (row) => row.id,
        );
      }
    }
  }

  for (const batch of side.payrollBatches) {
    if (batch.entryId !== entry.id) continue;
    pushUnique(references, {
      type: "payrollBatch",
      id: batch.id,
      label: `工资 ${batch.period}`,
    });
  }
  for (const pay of side.payrollPays) {
    if (pay.entryId !== entry.id && pay.reverseEntryId !== entry.id) continue;
    pushUnique(references, {
      type: "payrollPayment",
      id: pay.id,
      label: `工资付款 ${pay.cents}分`,
    });
  }
  for (const asset of side.assets) {
    if (asset.acquisitionEntryId !== entry.id && asset.disposeEntryId !== entry.id) continue;
    pushUnique(references, {
      type: "fixedAsset",
      id: asset.id,
      label: `${asset.code} ${asset.name}`,
    });
  }
  for (const dep of side.deps) {
    if (dep.entryId !== entry.id) continue;
    pushUnique(references, {
      type: "fixedAssetDepreciation",
      id: dep.id,
      label: `${dep.asset.code} ${dep.yearMonth} 折旧`,
    });
  }

  return {
    id: displayNumber(period, entry.reference, entry.id),
    entryId: entry.id,
    period,
    displayNumber: displayNumber(period, entry.reference, entry.id),
    reference: entry.reference,
    occurredOn: entry.occurredOn,
    memo: entry.memo,
    debitCents,
    creditCents,
    contentHash: contentHash({
      occurredOn: entry.occurredOn,
      memo: entry.memo,
      reference: entry.reference,
      lines: lines.map((l) => ({ accountCode: l.accountCode, side: l.side, cents: l.cents })),
    }),
    lines,
    references,
    attachments,
  };
}

export async function listArchiveCases(
  bookId: string,
  query: { period?: string; keyword?: string } = {},
) {
  const where: {
    bookId: string;
    occurredOn?: { startsWith: string };
  } = { bookId };
  if (query.period) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(query.period)) {
      throw new Error("期间格式应为 YYYY-MM");
    }
    where.occurredOn = { startsWith: `${query.period}-` };
  }

  const entries = await db.entry.findMany({
    where,
    include: {
      postings: { include: { account: true }, orderBy: { side: "asc" } },
    },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const side = await loadSideData(entries.map((row) => row.id));
  const cases = entries.map((entry) => enrichEntry(entry, side));

  const keyword = (query.keyword || "").trim().toLowerCase();
  if (!keyword) return cases;
  return cases.filter((row) => {
    const hay = [
      row.id,
      row.displayNumber,
      row.reference || "",
      row.memo,
      ...row.references.flatMap((r) => [r.id, r.label]),
      ...row.attachments.map((a) => a.fileName),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(keyword);
  });
}

export async function getArchiveCase(bookId: string, entryId: string) {
  const entry = await db.entry.findFirst({
    where: { id: entryId, bookId },
    include: {
      postings: { include: { account: true }, orderBy: { side: "asc" } },
    },
  });
  if (!entry) return null;
  const side = await loadSideData([entry.id]);
  return enrichEntry(entry, side);
}
