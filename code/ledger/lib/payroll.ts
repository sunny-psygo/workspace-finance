import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AuthUser, userHasAnyRole } from "./auth";
import { db } from "./db";
import { ensureDefaultAccounts, postEntry } from "./ledger";
import {
  calculateSalaryTax,
  monthIndexFromPeriod,
  netPayWithConfirmedTax,
} from "./payroll-tax";

export class PayrollError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly next: string,
  ) {
    super(message);
  }
}

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const lineInput = z.object({
  personCode: z.string().trim().min(1).max(40),
  personName: z.string().trim().min(1).max(40),
  grossCents: z.number().int().positive(),
  employeeSiCents: z.number().int().nonnegative().default(0),
  housingFundCents: z.number().int().nonnegative().default(0),
  otherDeductionCents: z.number().int().nonnegative().default(0),
  employerSiCents: z.number().int().nonnegative().default(0),
  employerHfCents: z.number().int().nonnegative().default(0),
  priorGrossCents: z.number().int().nonnegative().default(0),
  priorSiCents: z.number().int().nonnegative().default(0),
  priorHfCents: z.number().int().nonnegative().default(0),
  priorTaxCents: z.number().int().nonnegative().default(0),
});

const createBatchInput = z.object({
  period: periodSchema,
  taxPeriod: periodSchema.optional(),
  remark: z.string().trim().max(200).optional().default(""),
  mutationId: z.string().trim().min(1).max(120),
});

const setLinesInput = z.object({
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  lines: z.array(lineInput).min(1).max(1000),
});

const confirmTaxInput = z.object({
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  lines: z
    .array(
      z.object({
        lineId: z.string().trim().min(1),
        confirmedTaxCents: z.number().int().nonnegative(),
        reason: z.string().trim().max(200).optional().default(""),
      }),
    )
    .optional(),
});

const bureauTaxInput = z.object({
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  results: z
    .array(
      z.object({
        personCode: z.string().trim().min(1).max(40),
        bureauTaxCents: z.number().int().nonnegative(),
        confirmedTaxCents: z.number().int().nonnegative().optional(),
        reason: z.string().trim().max(200).optional().default(""),
      }),
    )
    .min(1)
    .max(1000),
});

const openingTaxInput = z.object({
  year: z.number().int().min(2000).max(2100),
  mutationId: z.string().trim().min(1).max(120),
  lines: z
    .array(
      z.object({
        personCode: z.string().trim().min(1).max(40),
        personName: z.string().trim().max(40).optional().default(""),
        grossCents: z.number().int().nonnegative().default(0),
        siCents: z.number().int().nonnegative().default(0),
        hfCents: z.number().int().nonnegative().default(0),
        taxCents: z.number().int().nonnegative().default(0),
        remark: z.string().trim().max(200).optional().default(""),
      }),
    )
    .min(1)
    .max(1000),
});

const mutationOnlyInput = z.object({
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  remark: z.string().trim().max(200).optional().default(""),
});

const payInput = z.object({
  statementId: z.string().trim().min(1),
  cents: z.number().int().positive(),
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  remark: z.string().trim().max(200).optional().default(""),
});

const reversePayInput = z.object({
  expectedRevision: z.number().int().nonnegative(),
  mutationId: z.string().trim().min(1).max(120),
  remark: z.string().trim().min(1).max(200),
});

export type CreatePayrollBatchInput = z.input<typeof createBatchInput>;
export type SetPayrollLinesInput = z.input<typeof setLinesInput>;
export type ConfirmPayrollTaxInput = z.input<typeof confirmTaxInput>;
export type BureauTaxInput = z.input<typeof bureauTaxInput>;
export type OpeningTaxInput = z.input<typeof openingTaxInput>;
export type PayrollMutationInput = z.input<typeof mutationOnlyInput>;
export type PayrollPayInput = z.input<typeof payInput>;
export type ReversePayrollPayInput = z.input<typeof reversePayInput>;

const batchInclude = {
  lines: { orderBy: { sortOrder: "asc" as const } },
  payments: { orderBy: { createdAt: "asc" as const } },
};

function assertHrOrFinance(user: AuthUser) {
  if (!userHasAnyRole(user, ["hr", "finance", "gm"])) {
    throw new PayrollError("需要人事或财务权限。", "PAYROLL_FORBIDDEN", "换有 hr/finance 角色的账号。");
  }
}

function assertFinance(user: AuthUser) {
  if (!userHasAnyRole(user, ["finance", "gm"])) {
    throw new PayrollError("需要财务权限。", "PAYROLL_FORBIDDEN", "换 finance 账号。");
  }
}

function assertCashier(user: AuthUser) {
  if (!userHasAnyRole(user, ["cashier", "finance"])) {
    throw new PayrollError("需要出纳或财务权限。", "PAYROLL_FORBIDDEN", "换 cashier 账号。");
  }
}

async function loadBatch(batchId: string) {
  const batch = await db.payrollBatch.findUnique({
    where: { id: batchId },
    include: batchInclude,
  });
  if (!batch) throw new PayrollError("工资批次不存在。", "PAYROLL_INVALID", "核对 batch id。");
  return batch;
}

async function priorsForPerson(
  bookId: string,
  personCode: string,
  taxPeriod: string,
): Promise<{ priorGrossCents: number; priorSiCents: number; priorHfCents: number; priorTaxCents: number }> {
  const year = Number(taxPeriod.slice(0, 4));
  const opening = await db.payrollOpeningTax.findUnique({
    where: { bookId_year_personCode: { bookId, year, personCode } },
  });
  let priorGrossCents = opening?.grossCents ?? 0;
  let priorSiCents = opening?.siCents ?? 0;
  let priorHfCents = opening?.hfCents ?? 0;
  let priorTaxCents = opening?.taxCents ?? 0;

  const posted = await db.payrollBatch.findMany({
    where: {
      bookId,
      status: { in: ["posted", "paid"] },
      taxPeriod: { gte: `${year}-01`, lt: taxPeriod },
    },
    include: { lines: true },
    orderBy: { taxPeriod: "asc" },
  });
  for (const batch of posted) {
    for (const line of batch.lines) {
      if (line.personCode !== personCode) continue;
      priorGrossCents += line.grossCents;
      priorSiCents += line.employeeSiCents;
      priorHfCents += line.housingFundCents;
      priorTaxCents += line.confirmedTaxCents;
    }
  }
  return { priorGrossCents, priorSiCents, priorHfCents, priorTaxCents };
}

function totalsFromLines(
  lines: Array<{
    grossCents: number;
    employeeSiCents: number;
    housingFundCents: number;
    otherDeductionCents: number;
    employerSiCents: number;
    employerHfCents: number;
    confirmedTaxCents: number;
    netCents: number;
  }>,
) {
  return lines.reduce(
    (sum, line) => ({
      grossCents: sum.grossCents + line.grossCents,
      employeeSiCents: sum.employeeSiCents + line.employeeSiCents,
      housingFundCents: sum.housingFundCents + line.housingFundCents,
      otherDeductionCents: sum.otherDeductionCents + line.otherDeductionCents,
      employerSiCents: sum.employerSiCents + line.employerSiCents,
      employerHfCents: sum.employerHfCents + line.employerHfCents,
      taxCents: sum.taxCents + line.confirmedTaxCents,
      netCents: sum.netCents + line.netCents,
    }),
    {
      grossCents: 0,
      employeeSiCents: 0,
      housingFundCents: 0,
      otherDeductionCents: 0,
      employerSiCents: 0,
      employerHfCents: 0,
      taxCents: 0,
      netCents: 0,
    },
  );
}

export async function listPayrollBatches(bookId: string, period?: string) {
  return db.payrollBatch.findMany({
    where: { bookId, ...(period ? { period } : {}) },
    include: batchInclude,
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPayrollBatch(batchId: string) {
  return loadBatch(batchId);
}

export async function createPayrollBatch(
  user: AuthUser,
  bookId: string,
  input: CreatePayrollBatchInput,
) {
  assertHrOrFinance(user);
  const parsed = createBatchInput.safeParse(input);
  if (!parsed.success) {
    throw new PayrollError(
      "创建批次字段不合要求。",
      "PAYROLL_INVALID",
      parsed.error.issues.map((issue) => issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) throw new PayrollError("账套不存在。", "PAYROLL_INVALID", "先开账。");

  const existing = await db.payrollBatch.findFirst({
    where: { bookId, lastMutationId: data.mutationId },
    include: batchInclude,
  });
  if (existing) return existing;

  return db.payrollBatch.create({
    data: {
      id: randomUUID(),
      bookId,
      period: data.period,
      taxPeriod: data.taxPeriod ?? data.period,
      status: "draft",
      revision: 0,
      lastMutationId: data.mutationId,
      remark: data.remark ?? "",
      createdBy: user.displayName,
    },
    include: batchInclude,
  });
}

export async function setPayrollLines(
  user: AuthUser,
  batchId: string,
  input: SetPayrollLinesInput,
) {
  assertHrOrFinance(user);
  const parsed = setLinesInput.safeParse(input);
  if (!parsed.success) {
    throw new PayrollError(
      "工资行字段不合要求。",
      "PAYROLL_INVALID",
      parsed.error.issues.map((issue) => issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const batch = await loadBatch(batchId);

  if (batch.lastMutationId === data.mutationId) return batch;
  if (batch.status !== "draft" && batch.status !== "calculated") {
    throw new PayrollError(
      `状态 ${batch.status} 不能改行。`,
      "PAYROLL_STATUS",
      "仅 draft/calculated 可改；已确认税请先反确认。",
    );
  }
  if (batch.revision !== data.expectedRevision) {
    throw new PayrollError("版本冲突。", "PAYROLL_REVISION_CONFLICT", "刷新后再提交。");
  }

  const codes = new Set<string>();
  for (const line of data.lines) {
    if (codes.has(line.personCode)) {
      throw new PayrollError(
        `人员编号重复：${line.personCode}。`,
        "PAYROLL_INVALID",
        "同一批次每人一行。",
      );
    }
    codes.add(line.personCode);
    if (line.employeeSiCents + line.housingFundCents + line.otherDeductionCents > line.grossCents) {
      throw new PayrollError(
        `${line.personName} 个人扣款超过应发。`,
        "PAYROLL_INVALID",
        "核对社保/公积金/其他扣款。",
      );
    }
  }

  const monthIndex = monthIndexFromPeriod(batch.taxPeriod);
  const computed = [];
  for (let index = 0; index < data.lines.length; index += 1) {
    const line = data.lines[index];
    const autoPrior = await priorsForPerson(batch.bookId, line.personCode, batch.taxPeriod);
    // 行上显式 prior* 为 0 时也走自动累计；只有调用方传入正数才覆盖（zod default 0）
    const priorGrossCents = line.priorGrossCents > 0 ? line.priorGrossCents : autoPrior.priorGrossCents;
    const priorSiCents = line.priorSiCents > 0 ? line.priorSiCents : autoPrior.priorSiCents;
    const priorHfCents = line.priorHfCents > 0 ? line.priorHfCents : autoPrior.priorHfCents;
    const priorTaxCents = line.priorTaxCents > 0 ? line.priorTaxCents : autoPrior.priorTaxCents;
    const tax = calculateSalaryTax({
      monthIndex,
      grossCents: line.grossCents,
      employeeSiCents: line.employeeSiCents,
      housingFundCents: line.housingFundCents,
      otherDeductionCents: line.otherDeductionCents,
      priorGrossCents,
      priorSiCents,
      priorHfCents,
      priorTaxCents,
    });
    computed.push({
      id: randomUUID(),
      batchId: batch.id,
      personCode: line.personCode,
      personName: line.personName,
      grossCents: line.grossCents,
      employeeSiCents: line.employeeSiCents,
      housingFundCents: line.housingFundCents,
      otherDeductionCents: line.otherDeductionCents,
      employerSiCents: line.employerSiCents,
      employerHfCents: line.employerHfCents,
      priorGrossCents,
      priorSiCents,
      priorHfCents,
      priorTaxCents,
      estimatedTaxCents: tax.estimatedTaxCents,
      bureauTaxCents: null,
      confirmedTaxCents: tax.estimatedTaxCents,
      taxAdjustReason: "",
      netCents: tax.netCents,
      sortOrder: index,
    });
  }

  const totals = totalsFromLines(computed);
  await db.$transaction(async (tx) => {
    await tx.payrollLine.deleteMany({ where: { batchId: batch.id } });
    await tx.payrollLine.createMany({ data: computed });
    await tx.payrollBatch.update({
      where: { id: batch.id, revision: data.expectedRevision },
      data: {
        status: "calculated",
        revision: { increment: 1 },
        lastMutationId: data.mutationId,
        ...totals,
        lockedAt: null,
        lockedBy: "",
      },
    });
  });
  return loadBatch(batchId);
}

export async function confirmPayrollTax(
  user: AuthUser,
  batchId: string,
  input: ConfirmPayrollTaxInput,
) {
  assertFinance(user);
  const parsed = confirmTaxInput.safeParse(input);
  if (!parsed.success) {
    throw new PayrollError(
      "确认个税字段不合要求。",
      "PAYROLL_INVALID",
      parsed.error.issues.map((issue) => issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const batch = await loadBatch(batchId);
  if (batch.lastMutationId === data.mutationId) return batch;
  if (batch.status !== "calculated" && batch.status !== "taxVerified") {
    throw new PayrollError(
      `状态 ${batch.status} 不能确认个税。`,
      "PAYROLL_STATUS",
      "先提交工资行并试算。",
    );
  }
  if (batch.revision !== data.expectedRevision) {
    throw new PayrollError("版本冲突。", "PAYROLL_REVISION_CONFLICT", "刷新后再提交。");
  }
  if (!batch.lines.length) {
    throw new PayrollError("批次没有工资行。", "PAYROLL_INVALID", "先写入行。");
  }

  const overrides = new Map((data.lines ?? []).map((row) => [row.lineId, row]));
  const nextLines = batch.lines.map((line) => {
    const override = overrides.get(line.id);
    const confirmed = override ? override.confirmedTaxCents : line.confirmedTaxCents;
    if (override && confirmed !== line.estimatedTaxCents && !override.reason.trim()) {
      throw new PayrollError(
        `${line.personName} 确认税额与试算不同，须填写原因。`,
        "PAYROLL_TAX_REQUIRED",
        "在 reason 写明依据。",
      );
    }
    const netCents = netPayWithConfirmedTax({
      grossCents: line.grossCents,
      employeeSiCents: line.employeeSiCents,
      housingFundCents: line.housingFundCents,
      otherDeductionCents: line.otherDeductionCents,
      confirmedTaxCents: confirmed,
    });
    return {
      ...line,
      confirmedTaxCents: confirmed,
      taxAdjustReason: override?.reason?.trim() || line.taxAdjustReason,
      netCents,
    };
  });

  const totals = totalsFromLines(nextLines);
  await db.$transaction(async (tx) => {
    for (const line of nextLines) {
      await tx.payrollLine.update({
        where: { id: line.id },
        data: {
          confirmedTaxCents: line.confirmedTaxCents,
          taxAdjustReason: line.taxAdjustReason,
          netCents: line.netCents,
        },
      });
    }
    await tx.payrollBatch.update({
      where: { id: batch.id, revision: data.expectedRevision },
      data: {
        status: "taxVerified",
        revision: { increment: 1 },
        lastMutationId: data.mutationId,
        ...totals,
        lockedAt: new Date(),
        lockedBy: user.displayName,
      },
    });
  });
  return loadBatch(batchId);
}

export async function importBureauTax(
  user: AuthUser,
  batchId: string,
  input: BureauTaxInput,
) {
  assertFinance(user);
  const parsed = bureauTaxInput.safeParse(input);
  if (!parsed.success) {
    throw new PayrollError(
      "税局导入字段不合要求。",
      "PAYROLL_INVALID",
      parsed.error.issues.map((issue) => issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const batch = await loadBatch(batchId);
  if (batch.lastMutationId === data.mutationId) return { batch, issues: [] as string[] };
  if (batch.status !== "calculated" && batch.status !== "taxVerified") {
    throw new PayrollError(
      `状态 ${batch.status} 不能导入税局结果。`,
      "PAYROLL_STATUS",
      "先提交工资行并试算。",
    );
  }
  if (batch.revision !== data.expectedRevision) {
    throw new PayrollError("版本冲突。", "PAYROLL_REVISION_CONFLICT", "刷新后再提交。");
  }
  if (!batch.lines.length) {
    throw new PayrollError("批次没有工资行。", "PAYROLL_INVALID", "先写入行。");
  }

  const byCode = new Map(batch.lines.map((line) => [line.personCode, line]));
  const seen = new Set<string>();
  const missing: string[] = [];
  const unexpected: string[] = [];
  const issues: string[] = [];

  for (const row of data.results) {
    if (seen.has(row.personCode)) {
      issues.push(`人员 ${row.personCode} 在导入结果中重复。`);
    }
    seen.add(row.personCode);
    if (!byCode.has(row.personCode)) unexpected.push(row.personCode);
  }
  for (const line of batch.lines) {
    if (!seen.has(line.personCode)) missing.push(line.personCode);
  }
  if (missing.length || unexpected.length || issues.length) {
    throw new PayrollError(
      [
        missing.length ? `缺人：${missing.join("、")}` : "",
        unexpected.length ? `多人：${unexpected.join("、")}` : "",
        ...issues,
      ]
        .filter(Boolean)
        .join("；"),
      "PAYROLL_TAX_COVERAGE",
      "导入结果必须与本批次人员一一对应。",
    );
  }

  const resultMap = new Map(data.results.map((row) => [row.personCode, row]));
  const nextLines = batch.lines.map((line) => {
    const row = resultMap.get(line.personCode)!;
    const bureau = row.bureauTaxCents;
    const confirmed = row.confirmedTaxCents ?? bureau;
    const reason = (row.reason ?? "").trim();
    if (confirmed !== line.estimatedTaxCents && !reason) {
      issues.push(
        `${line.personName}(${line.personCode}) 确认税 ${confirmed} 与试算 ${line.estimatedTaxCents} 不同，须填 reason。`,
      );
    }
    if (confirmed !== bureau && !reason) {
      issues.push(
        `${line.personName}(${line.personCode}) 确认税与税局数不同，须填 reason。`,
      );
    }
    return {
      ...line,
      bureauTaxCents: bureau,
      confirmedTaxCents: confirmed,
      taxAdjustReason: reason || line.taxAdjustReason,
      netCents: netPayWithConfirmedTax({
        grossCents: line.grossCents,
        employeeSiCents: line.employeeSiCents,
        housingFundCents: line.housingFundCents,
        otherDeductionCents: line.otherDeductionCents,
        confirmedTaxCents: confirmed,
      }),
    };
  });
  if (issues.length) {
    throw new PayrollError(issues.join("；"), "PAYROLL_TAX_MISMATCH", "补齐差异原因或修正税额后再导入。");
  }

  const totals = totalsFromLines(nextLines);
  await db.$transaction(async (tx) => {
    for (const line of nextLines) {
      await tx.payrollLine.update({
        where: { id: line.id },
        data: {
          bureauTaxCents: line.bureauTaxCents,
          confirmedTaxCents: line.confirmedTaxCents,
          taxAdjustReason: line.taxAdjustReason,
          netCents: line.netCents,
        },
      });
    }
    await tx.payrollBatch.update({
      where: { id: batch.id, revision: data.expectedRevision },
      data: {
        status: "taxVerified",
        revision: { increment: 1 },
        lastMutationId: data.mutationId,
        ...totals,
        lockedAt: new Date(),
        lockedBy: user.displayName,
      },
    });
  });
  return { batch: await loadBatch(batchId), issues: [] as string[] };
}

export async function listOpeningTax(bookId: string, year: number) {
  return db.payrollOpeningTax.findMany({
    where: { bookId, year },
    orderBy: { personCode: "asc" },
  });
}

export async function upsertOpeningTax(
  user: AuthUser,
  bookId: string,
  input: OpeningTaxInput,
) {
  assertFinance(user);
  const parsed = openingTaxInput.safeParse(input);
  if (!parsed.success) {
    throw new PayrollError(
      "期初累计字段不合要求。",
      "PAYROLL_INVALID",
      parsed.error.issues.map((issue) => issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) throw new PayrollError("账套不存在。", "PAYROLL_INVALID", "先开账。");

  const codes = new Set<string>();
  for (const line of data.lines) {
    if (codes.has(line.personCode)) {
      throw new PayrollError(`人员编号重复：${line.personCode}。`, "PAYROLL_INVALID", "每人一行。");
    }
    codes.add(line.personCode);
  }

  await db.$transaction(async (tx) => {
    for (const line of data.lines) {
      await tx.payrollOpeningTax.upsert({
        where: {
          bookId_year_personCode: {
            bookId,
            year: data.year,
            personCode: line.personCode,
          },
        },
        create: {
          id: randomUUID(),
          bookId,
          year: data.year,
          personCode: line.personCode,
          personName: line.personName ?? "",
          grossCents: line.grossCents,
          siCents: line.siCents,
          hfCents: line.hfCents,
          taxCents: line.taxCents,
          remark: line.remark ?? "",
          updatedBy: user.displayName,
        },
        update: {
          personName: line.personName ?? "",
          grossCents: line.grossCents,
          siCents: line.siCents,
          hfCents: line.hfCents,
          taxCents: line.taxCents,
          remark: line.remark ?? "",
          updatedBy: user.displayName,
        },
      });
    }
  });
  return listOpeningTax(bookId, data.year);
}

export async function unconfirmPayrollTax(
  user: AuthUser,
  batchId: string,
  input: PayrollMutationInput,
) {
  assertFinance(user);
  const parsed = mutationOnlyInput.safeParse(input);
  if (!parsed.success) {
    throw new PayrollError("字段不合要求。", "PAYROLL_INVALID", parsed.error.issues.map((i) => i.message).join("；"));
  }
  const data = parsed.data;
  const batch = await loadBatch(batchId);
  if (batch.lastMutationId === data.mutationId) return batch;
  if (batch.status !== "taxVerified") {
    throw new PayrollError(`状态 ${batch.status} 不能反确认。`, "PAYROLL_STATUS", "仅 taxVerified 可反确认。");
  }
  if (batch.revision !== data.expectedRevision) {
    throw new PayrollError("版本冲突。", "PAYROLL_REVISION_CONFLICT", "刷新后再提交。");
  }
  await db.payrollBatch.update({
    where: { id: batch.id, revision: data.expectedRevision },
    data: {
      status: "calculated",
      revision: { increment: 1 },
      lastMutationId: data.mutationId,
      lockedAt: null,
      lockedBy: "",
    },
  });
  return loadBatch(batchId);
}

export async function postPayrollBatch(
  user: AuthUser,
  batchId: string,
  input: PayrollMutationInput,
) {
  assertFinance(user);
  const parsed = mutationOnlyInput.safeParse(input);
  if (!parsed.success) {
    throw new PayrollError("字段不合要求。", "PAYROLL_INVALID", parsed.error.issues.map((i) => i.message).join("；"));
  }
  const data = parsed.data;
  const batch = await loadBatch(batchId);
  if (batch.lastMutationId === data.mutationId) return batch;
  if (batch.status === "posted" || batch.status === "paid") return batch;
  if (batch.status !== "taxVerified") {
    throw new PayrollError("须先确认个税再过账。", "PAYROLL_STATUS", "调用 confirm-tax。");
  }
  if (batch.revision !== data.expectedRevision) {
    throw new PayrollError("版本冲突。", "PAYROLL_REVISION_CONFLICT", "刷新后再提交。");
  }
  if (batch.netCents <= 0 && batch.taxCents <= 0 && batch.employeeSiCents + batch.housingFundCents + batch.otherDeductionCents <= 0) {
    throw new PayrollError("没有可入账金额。", "PAYROLL_INVALID", "检查工资行。");
  }

  await ensureDefaultAccounts(batch.bookId);
  // 借：应发 + 单位社保公积金；贷：实发应付 + 个税 + 代扣（个人+单位）
  const expenseCents = batch.grossCents + batch.employerSiCents + batch.employerHfCents;
  const payableExtraCents =
    batch.employeeSiCents +
    batch.housingFundCents +
    batch.otherDeductionCents +
    batch.employerSiCents +
    batch.employerHfCents;
  const postings: Array<{ accountCode: string; side: "debit" | "credit"; cents: number }> = [];
  if (expenseCents > 0) postings.push({ accountCode: "5602", side: "debit", cents: expenseCents });
  if (batch.netCents > 0) postings.push({ accountCode: "2211", side: "credit", cents: batch.netCents });
  if (batch.taxCents > 0) postings.push({ accountCode: "2221", side: "credit", cents: batch.taxCents });
  if (payableExtraCents > 0) postings.push({ accountCode: "2241", side: "credit", cents: payableExtraCents });

  const debit = postings.filter((p) => p.side === "debit").reduce((s, p) => s + p.cents, 0);
  const credit = postings.filter((p) => p.side === "credit").reduce((s, p) => s + p.cents, 0);
  if (debit !== credit) {
    throw new PayrollError(
      `工资分录不平衡：借 ${debit} 贷 ${credit}。`,
      "PAYROLL_INVALID",
      "检查合计字段。",
    );
  }

  const occurredOn = `${batch.period}-28`;
  const entry = await postEntry(batch.bookId, {
    occurredOn,
    memo: data.remark?.trim() || `${batch.period} 工资计提`,
    reference: `payroll-post:${batch.id}`,
    postings,
  });

  await db.payrollBatch.update({
    where: { id: batch.id, revision: data.expectedRevision },
    data: {
      status: "posted",
      revision: { increment: 1 },
      lastMutationId: data.mutationId,
      entryId: entry.id,
    },
  });
  return loadBatch(batchId);
}

export async function allocatePayrollPayment(
  user: AuthUser,
  batchId: string,
  input: PayrollPayInput,
) {
  assertCashier(user);
  const parsed = payInput.safeParse(input);
  if (!parsed.success) {
    throw new PayrollError("付款字段不合要求。", "PAYROLL_INVALID", parsed.error.issues.map((i) => i.message).join("；"));
  }
  const data = parsed.data;
  const batch = await loadBatch(batchId);
  const existingPay = batch.payments.find((row) => row.mutationId === data.mutationId);
  if (existingPay) return batch;
  if (batch.status !== "posted" && batch.status !== "paid") {
    throw new PayrollError("须先过账再付实发。", "PAYROLL_STATUS", "先 post。");
  }
  if (batch.revision !== data.expectedRevision) {
    throw new PayrollError("版本冲突。", "PAYROLL_REVISION_CONFLICT", "刷新后再提交。");
  }
  const unpaid = batch.netCents - batch.paidCents;
  if (data.cents > unpaid) {
    throw new PayrollError(
      `付款 ${data.cents} 分超过未付实发 ${unpaid} 分。`,
      "PAYROLL_INVALID",
      "降低金额。",
    );
  }

  const statement = await db.bankStatement.findFirst({
    where: { id: data.statementId, bookId: batch.bookId, voidedAt: null },
  });
  if (!statement) throw new PayrollError("银行流水不存在。", "PAYROLL_INVALID", "核对 statementId。");
  if (statement.remainingCents < data.cents) {
    throw new PayrollError(
      `流水剩余 ${statement.remainingCents} 分不足。`,
      "PAYROLL_INVALID",
      "换流水或降低金额。",
    );
  }

  const entry = await postEntry(batch.bookId, {
    occurredOn: statement.paidOn,
    memo: data.remark?.trim() || `${batch.period} 工资实发`,
    reference: `payroll-pay:${batch.id}:${data.mutationId}`,
    postings: [
      { accountCode: "2211", side: "debit", cents: data.cents },
      { accountCode: statement.bankAccountCode, side: "credit", cents: data.cents },
    ],
  });

  const paidCents = batch.paidCents + data.cents;
  const status = paidCents >= batch.netCents ? "paid" : "posted";

  await db.$transaction(async (tx) => {
    await tx.bankStatement.update({
      where: { id: statement.id },
      data: { remainingCents: { decrement: data.cents } },
    });
    await tx.payrollPaymentAllocation.create({
      data: {
        id: randomUUID(),
        batchId: batch.id,
        statementId: statement.id,
        cents: data.cents,
        entryId: entry.id,
        mutationId: data.mutationId,
        remark: data.remark ?? "",
        uploadedBy: user.displayName,
      },
    });
    await tx.payrollBatch.update({
      where: { id: batch.id, revision: data.expectedRevision },
      data: {
        paidCents,
        status,
        revision: { increment: 1 },
        lastMutationId: data.mutationId,
      },
    });
  });
  return loadBatch(batchId);
}

export async function reversePayrollPayment(
  user: AuthUser,
  batchId: string,
  allocationId: string,
  input: ReversePayrollPayInput,
) {
  assertCashier(user);
  const parsed = reversePayInput.safeParse(input);
  if (!parsed.success) {
    throw new PayrollError("撤销字段不合要求。", "PAYROLL_INVALID", parsed.error.issues.map((i) => i.message).join("；"));
  }
  const data = parsed.data;
  const batch = await loadBatch(batchId);
  if (batch.lastMutationId === data.mutationId) return batch;
  const allocation = batch.payments.find((row) => row.id === allocationId);
  if (!allocation) throw new PayrollError("付款匹配不存在。", "PAYROLL_INVALID", "核对 allocationId。");
  if (allocation.reversedAt) return batch;
  if (batch.revision !== data.expectedRevision) {
    throw new PayrollError("版本冲突。", "PAYROLL_REVISION_CONFLICT", "刷新后再提交。");
  }

  const statement = await db.bankStatement.findUniqueOrThrow({ where: { id: allocation.statementId } });
  const entry = await db.entry.findUnique({
    where: { id: allocation.entryId },
    include: { postings: { include: { account: true } } },
  });
  if (!entry) throw new PayrollError("原付款分录丢失。", "PAYROLL_INVALID", "联系维护。");

  const reverse = await postEntry(batch.bookId, {
    occurredOn: entry.occurredOn,
    memo: data.remark.trim(),
    reference: `payroll-pay-rev:${data.mutationId}`,
    postings: entry.postings.map((line) => ({
      accountCode: line.account.code,
      side: line.side === "debit" ? "credit" : "debit",
      cents: line.cents,
    })),
  });

  const paidCents = Math.max(0, batch.paidCents - allocation.cents);
  await db.$transaction(async (tx) => {
    await tx.bankStatement.update({
      where: { id: statement.id },
      data: { remainingCents: { increment: allocation.cents } },
    });
    await tx.payrollPaymentAllocation.update({
      where: { id: allocation.id },
      data: {
        reversedAt: new Date(),
        reverseEntryId: reverse.id,
        reverseMutationId: data.mutationId,
        reverseRemark: data.remark.trim(),
      },
    });
    await tx.payrollBatch.update({
      where: { id: batch.id, revision: data.expectedRevision },
      data: {
        paidCents,
        status: "posted",
        revision: { increment: 1 },
        lastMutationId: data.mutationId,
      },
    });
  });
  return loadBatch(batchId);
}

/** 结账用：该月是否仍有未完工资批次 */
export async function openPayrollInMonth(bookId: string, yearMonth: string) {
  return db.payrollBatch.findMany({
    where: {
      bookId,
      period: yearMonth,
      status: { in: ["draft", "calculated", "taxVerified", "posted"] },
    },
    select: { id: true, status: true, netCents: true, paidCents: true },
    take: 20,
  });
}
