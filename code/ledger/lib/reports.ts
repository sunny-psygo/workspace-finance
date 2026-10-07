import { monthPlMovements, trialBalance } from "./ledger";

export type ReportLine = {
  key: string;
  label: string;
  cents: number;
  indent?: number;
};

export type BalanceSheet = {
  asOf: string;
  assets: ReportLine[];
  liabilities: ReportLine[];
  equity: ReportLine[];
  assetTotalCents: number;
  liabilityTotalCents: number;
  equityTotalCents: number;
  liabilityAndEquityTotalCents: number;
  balanced: boolean;
};

export type IncomeStatement = {
  yearMonth: string;
  lines: ReportLine[];
  incomeTotalCents: number;
  expenseTotalCents: number;
  profitCents: number;
};

function bal(rows: Awaited<ReturnType<typeof trialBalance>>, code: string) {
  return rows.find((row) => row.code === code)?.balanceCents ?? 0;
}

function sumByKind(rows: Awaited<ReturnType<typeof trialBalance>>, kind: string) {
  return rows.filter((row) => row.kind === kind).reduce((sum, row) => sum + row.balanceCents, 0);
}

/** 资产负债表：试算余额派生；固定资产分列原价/累计折旧/净值；未结转损益并入权益。 */
export async function balanceSheet(bookId: string): Promise<BalanceSheet> {
  const rows = await trialBalance(bookId);

  const cashCents = rows
    .filter((row) => row.kind === "asset" && (row.code === "1001" || row.code === "1002" || row.code === "1012"))
    .reduce((sum, row) => sum + row.balanceCents, 0);

  const faCost = bal(rows, "1601");
  // 1602 贷记后余额为负；报表「累计折旧」列示为正数抵减
  const accumDep = Math.max(0, -bal(rows, "1602"));
  const faNbv = faCost - accumDep;

  const otherAssets = rows
    .filter(
      (row) =>
        row.kind === "asset" &&
        !["1001", "1002", "1012", "1601", "1602"].includes(row.code) &&
        row.balanceCents !== 0,
    )
    .map((row) => ({
      key: `asset-${row.code}`,
      label: `${row.code} ${row.name}`,
      cents: row.balanceCents,
      indent: 1,
    }));

  const payableSalary = bal(rows, "2211");
  const taxPayable = bal(rows, "2221");
  const otherPayable = bal(rows, "2241");
  const otherLiabilities = rows
    .filter(
      (row) =>
        row.kind === "liability" &&
        !["2211", "2221", "2241"].includes(row.code) &&
        row.balanceCents !== 0,
    )
    .map((row) => ({
      key: `liab-${row.code}`,
      label: `${row.code} ${row.name}`,
      cents: row.balanceCents,
      indent: 1,
    }));

  const yearProfit = bal(rows, "4103");
  const retained = bal(rows, "4104");
  const otherEquity = rows
    .filter(
      (row) =>
        row.kind === "equity" &&
        !["4103", "4104"].includes(row.code) &&
        row.balanceCents !== 0,
    )
    .map((row) => ({
      key: `eq-${row.code}`,
      label: `${row.code} ${row.name}`,
      cents: row.balanceCents,
      indent: 1,
    }));

  // 未结转的收入费用并入「未结转损益」，使报表在月结前也能左右平衡
  const openIncome = sumByKind(rows, "income");
  const openExpense = sumByKind(rows, "expense");
  const unclosedPl = openIncome - openExpense;

  const assets: ReportLine[] = [
    { key: "cash", label: "货币资金", cents: cashCents, indent: 1 },
    ...otherAssets,
    { key: "fa-cost", label: "固定资产原价", cents: faCost, indent: 1 },
    { key: "fa-accum", label: "减：累计折旧", cents: accumDep, indent: 1 },
    { key: "fa-nbv", label: "固定资产账面价值", cents: faNbv, indent: 1 },
  ];
  const assetTotalCents = cashCents + otherAssets.reduce((s, r) => s + r.cents, 0) + faNbv;

  const liabilities: ReportLine[] = [
    { key: "2211", label: "应付职工薪酬", cents: payableSalary, indent: 1 },
    { key: "2221", label: "应交税费", cents: taxPayable, indent: 1 },
    { key: "2241", label: "其他应付款", cents: otherPayable, indent: 1 },
    ...otherLiabilities,
  ];
  const liabilityTotalCents =
    payableSalary + taxPayable + otherPayable + otherLiabilities.reduce((s, r) => s + r.cents, 0);

  const equity: ReportLine[] = [
    ...otherEquity,
    { key: "4103", label: "本年利润", cents: yearProfit, indent: 1 },
    { key: "4104", label: "未分配利润", cents: retained, indent: 1 },
    { key: "unclosed-pl", label: "未结转损益", cents: unclosedPl, indent: 1 },
  ];
  const equityTotalCents =
    yearProfit + retained + unclosedPl + otherEquity.reduce((s, r) => s + r.cents, 0);

  const liabilityAndEquityTotalCents = liabilityTotalCents + equityTotalCents;

  return {
    asOf: new Date().toISOString().slice(0, 10),
    assets,
    liabilities,
    equity,
    assetTotalCents,
    liabilityTotalCents,
    equityTotalCents,
    liabilityAndEquityTotalCents,
    balanced: assetTotalCents === liabilityAndEquityTotalCents,
  };
}

/** 利润表：指定月收入/费用发生额（与结账同一口径）。 */
export async function incomeStatement(bookId: string, yearMonth: string): Promise<IncomeStatement> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
    throw new Error("期间格式应为 YYYY-MM");
  }
  const movements = await monthPlMovements(bookId, yearMonth);
  const incomeLines = movements
    .filter((row) => row.kind === "income")
    .map((row) => ({
      key: `inc-${row.code}`,
      label: `${row.code} 收入`,
      cents: row.netCents,
      indent: 1,
    }));
  const expenseLines = movements
    .filter((row) => row.kind === "expense")
    .map((row) => ({
      key: `exp-${row.code}`,
      label: row.code === "5602" ? "管理费用" : `${row.code} 费用`,
      cents: row.netCents,
      indent: 1,
    }));

  const incomeTotalCents = incomeLines.reduce((s, r) => s + r.cents, 0);
  const expenseTotalCents = expenseLines.reduce((s, r) => s + r.cents, 0);
  const profitCents = incomeTotalCents - expenseTotalCents;

  const lines: ReportLine[] = [
    { key: "income-header", label: "一、营业收入", cents: incomeTotalCents },
    ...incomeLines,
    { key: "expense-header", label: "减：营业费用", cents: expenseTotalCents },
    ...expenseLines,
    { key: "profit", label: "四、利润总额", cents: profitCents },
  ];

  return {
    yearMonth,
    lines,
    incomeTotalCents,
    expenseTotalCents,
    profitCents,
  };
}
