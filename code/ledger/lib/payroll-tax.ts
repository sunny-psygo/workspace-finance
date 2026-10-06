/** 居民工资薪金累计预扣法（金额单位：分）。规则版本与旧系统一致，便于对照。 */

export const TAX_RULE_VERSION = "CN-IIT-2018-61-v1";
export const MONTHLY_BASIC_DEDUCTION_CENTS = 500_000;

type RateBand = { limitCents: number; rateBp: number; quickDeductionCents: number };

// rateBp = 税率 × 10000，避免浮点（3% → 300）
const salaryBands: RateBand[] = [
  { limitCents: 3_600_000, rateBp: 300, quickDeductionCents: 0 },
  { limitCents: 14_400_000, rateBp: 1_000, quickDeductionCents: 252_000 },
  { limitCents: 30_000_000, rateBp: 2_000, quickDeductionCents: 1_692_000 },
  { limitCents: 42_000_000, rateBp: 2_500, quickDeductionCents: 3_192_000 },
  { limitCents: 66_000_000, rateBp: 3_000, quickDeductionCents: 5_292_000 },
  { limitCents: 96_000_000, rateBp: 3_500, quickDeductionCents: 8_592_000 },
  { limitCents: Number.MAX_SAFE_INTEGER, rateBp: 4_500, quickDeductionCents: 18_192_000 },
];

export type SalaryTaxInput = {
  monthIndex: number;
  grossCents: number;
  employeeSiCents: number;
  housingFundCents: number;
  otherDeductionCents: number;
  priorGrossCents: number;
  priorSiCents: number;
  priorHfCents: number;
  priorTaxCents: number;
  specialAdditionalCents?: number;
  otherTaxDeductionCents?: number;
};

export type SalaryTaxResult = {
  estimatedTaxCents: number;
  netCents: number;
  cumulativeTaxableIncomeCents: number;
  cumulativeTaxCents: number;
  ruleVersion: string;
};

function nonNeg(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function taxByBands(taxableCents: number, bands: RateBand[]) {
  const taxable = Math.max(0, taxableCents);
  for (const band of bands) {
    if (taxable <= band.limitCents) {
      return Math.max(0, Math.floor((taxable * band.rateBp) / 10_000) - band.quickDeductionCents);
    }
  }
  return 0;
}

export function monthIndexFromPeriod(period: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  return match ? Number(match[2]) : 0;
}

/** 工资薪金：累计预扣；返回本期应预扣个税与实发。 */
export function calculateSalaryTax(input: SalaryTaxInput): SalaryTaxResult {
  const monthIndex = Math.max(1, Math.min(12, Math.trunc(input.monthIndex) || 1));
  const gross = nonNeg(input.grossCents);
  const si = nonNeg(input.employeeSiCents);
  const hf = nonNeg(input.housingFundCents);
  const other = nonNeg(input.otherDeductionCents);
  const priorGross = nonNeg(input.priorGrossCents);
  const priorSi = nonNeg(input.priorSiCents);
  const priorHf = nonNeg(input.priorHfCents);
  const priorTax = nonNeg(input.priorTaxCents);
  const special = nonNeg(input.specialAdditionalCents ?? 0);
  const otherTax = nonNeg(input.otherTaxDeductionCents ?? 0);

  const cumulativeGross = priorGross + gross;
  const cumulativeSi = priorSi + si;
  const cumulativeHf = priorHf + hf;
  const cumulativeBasic = MONTHLY_BASIC_DEDUCTION_CENTS * monthIndex;
  const cumulativeTaxable = Math.max(
    0,
    cumulativeGross - cumulativeBasic - cumulativeSi - cumulativeHf - special - otherTax,
  );
  const cumulativeTax = taxByBands(cumulativeTaxable, salaryBands);
  const estimatedTax = Math.max(0, cumulativeTax - priorTax);
  const net = Math.max(0, gross - si - hf - other - estimatedTax);

  return {
    estimatedTaxCents: estimatedTax,
    netCents: net,
    cumulativeTaxableIncomeCents: cumulativeTaxable,
    cumulativeTaxCents: cumulativeTax,
    ruleVersion: TAX_RULE_VERSION,
  };
}

export function netPayWithConfirmedTax(input: {
  grossCents: number;
  employeeSiCents: number;
  housingFundCents: number;
  otherDeductionCents: number;
  confirmedTaxCents: number;
}) {
  return Math.max(
    0,
    nonNeg(input.grossCents) -
      nonNeg(input.employeeSiCents) -
      nonNeg(input.housingFundCents) -
      nonNeg(input.otherDeductionCents) -
      nonNeg(input.confirmedTaxCents),
  );
}
