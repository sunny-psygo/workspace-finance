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
  const payload = JSON.stringify({
    occurredOn: input.occurredOn,
    memo: input.memo,
    reference: input.reference,
    lines: input.lines,
  });
  return createHash("sha256").update(payload).digest("hex");
}

async function enrichEntry(entry: {
  id: string;
  occurredOn: string;
  memo: string;
  reference: string | null;
  postings: Array<{
    side: string;
    cents: number;
    account: { code: string; name: string };
  }>;
}): Promise<ArchiveCase> {
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

  const claims = await db.claim.findMany({
    where: {
      OR: [{ entryId: entry.id }, { paymentEntryId: entry.id }],
    },
    include: {
      items: { include: { attachments: true } },
      allocations: true,
    },
  });
  for (const claim of claims) {
    references.push({
      type: "claim",
      id: claim.id,
      label: `${claim.purpose}（${claim.status}）`,
    });
    for (const item of claim.items) {
      if (item.invoiceNo) {
        references.push({ type: "invoice", id: item.invoiceNo, label: item.invoiceNo });
      }
      for (const file of item.attachments) {
        attachments.push({
          id: file.id,
          documentType: "claimAttachment",
          fileName: file.fileName,
          contentType: file.contentType,
          byteSize: file.byteSize,
          storagePath: file.storagePath,
        });
      }
    }
    for (const alloc of claim.allocations) {
      if (alloc.entryId === entry.id || alloc.reverseEntryId === entry.id) {
        if (alloc.voucherNo) {
          references.push({ type: "paymentVoucher", id: alloc.voucherNo, label: alloc.voucherNo });
        }
        if (alloc.storagePath && alloc.fileName) {
          attachments.push({
            id: alloc.id,
            documentType: "paymentVoucher",
            fileName: alloc.fileName,
            contentType: "application/octet-stream",
            byteSize: 0,
            storagePath: alloc.storagePath,
          });
        }
      }
    }
  }

  const payrollBatches = await db.payrollBatch.findMany({
    where: { entryId: entry.id },
  });
  for (const batch of payrollBatches) {
    references.push({
      type: "payrollBatch",
      id: batch.id,
      label: `工资 ${batch.period}`,
    });
  }
  const payrollPays = await db.payrollPaymentAllocation.findMany({
    where: { OR: [{ entryId: entry.id }, { reverseEntryId: entry.id }] },
  });
  for (const pay of payrollPays) {
    references.push({
      type: "payrollPayment",
      id: pay.id,
      label: `工资付款 ${pay.cents}分`,
    });
  }

  const assets = await db.fixedAsset.findMany({
    where: {
      OR: [{ acquisitionEntryId: entry.id }, { disposeEntryId: entry.id }],
    },
  });
  for (const asset of assets) {
    references.push({
      type: "fixedAsset",
      id: asset.id,
      label: `${asset.code} ${asset.name}`,
    });
  }
  const deps = await db.fixedAssetDepreciation.findMany({
    where: { entryId: entry.id },
    include: { asset: true },
  });
  for (const dep of deps) {
    references.push({
      type: "fixedAssetDepreciation",
      id: dep.id,
      label: `${dep.asset.code} ${dep.yearMonth} 折旧`,
    });
  }

  // 去重引用
  const uniqRefs = Array.from(
    new Map(references.map((row) => [`${row.type}:${row.id}`, row])).values(),
  );
  const uniqAtt = Array.from(new Map(attachments.map((row) => [row.id, row])).values());

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
    references: uniqRefs,
    attachments: uniqAtt,
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

  const cases = [];
  for (const entry of entries) {
    cases.push(await enrichEntry(entry));
  }

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
  return enrichEntry(entry);
}
