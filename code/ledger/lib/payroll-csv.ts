/** 工资/税局 CSV 解析：纯函数，金额单位输出为分。 */

export type HrCsvRow = {
  personCode: string;
  personName: string;
  grossCents: number;
  employeeSiCents: number;
  housingFundCents: number;
  otherDeductionCents: number;
  employerSiCents: number;
  employerHfCents: number;
};

export type BureauCsvRow = {
  personCode: string;
  personName: string;
  bureauTaxCents: number;
  reason: string;
};

export class PayrollCsvError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly next: string,
  ) {
    super(message);
  }
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

/** 表内金额按「元」解析为分；支持 1,234.56 / ￥100 */
export function yuanTextToCents(value: unknown) {
  const normalized = text(value).replace(/[￥¥,\s]/g, "");
  if (!normalized) return 0;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) {
    throw new PayrollCsvError(`无法识别金额：${value}`, "PAYROLL_CSV_INVALID", "写成非负数字，单位元。");
  }
  return Math.round(number * 100);
}

export function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function splitCsvRows(source: string) {
  return text(source)
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

const hrAliases: Record<keyof Omit<HrCsvRow, never> | string, string[]> = {
  personCode: ["personCode", "personId", "employeeId", "人员编号", "员工编号", "工号"],
  personName: ["personName", "employeeName", "name", "姓名", "员工姓名"],
  grossCents: ["grossPay", "grossCents", "应发工资", "应发", "应发金额", "金额"],
  employeeSiCents: ["employeeSocialInsurance", "employeeSiCents", "个人社保", "社保个人"],
  housingFundCents: ["housingFund", "housingFundCents", "个人公积金", "公积金个人"],
  otherDeductionCents: ["otherCashDeduction", "otherDeductionCents", "其他扣款"],
  employerSiCents: ["employerSocialInsurance", "employerSiCents", "单位社保", "公司社保", "社保单位"],
  employerHfCents: ["employerHousingFund", "employerHfCents", "单位公积金", "公司公积金", "公积金单位"],
};

const bureauAliases = {
  personCode: ["personCode", "personId", "employeeId", "人员编号", "员工编号", "工号"],
  personName: ["personName", "employeeName", "name", "姓名", "员工姓名"],
  bureauTaxCents: [
    "bureauTax",
    "currentTax",
    "本期个税",
    "本期应扣税额",
    "应扣税额",
    "扣缴税额",
    "税额",
    "实际应扣缴税额",
    "应补/退税额",
    "应补（退）税额",
    "本期应补/退税额",
  ],
  reason: ["reason", "adjustmentReason", "差异原因", "原因", "备注"],
};

function pickHeaderIndex(headers: string[], aliases: string[]) {
  const normalized = headers.map((header) => text(header));
  return normalized.findIndex((header) => aliases.some((alias) => alias === header));
}

function buildIndex(headers: string[], aliasMap: Record<string, string[]>) {
  return Object.fromEntries(
    Object.entries(aliasMap).map(([field, aliases]) => [field, pickHeaderIndex(headers, aliases)]),
  ) as Record<string, number>;
}

export function parseHrPayrollCsv(source: string): HrCsvRow[] {
  const lines = splitCsvRows(source);
  if (lines.length < 2) {
    throw new PayrollCsvError("CSV 至少需要表头和一行明细。", "PAYROLL_CSV_INVALID", "补全表头与数据行。");
  }
  const headers = parseCsvLine(lines[0]);
  const indexes = buildIndex(headers, hrAliases);
  if (indexes.personCode < 0 && indexes.personName < 0) {
    throw new PayrollCsvError("缺少人员编号或姓名列。", "PAYROLL_CSV_INVALID", "表头加「人员编号」或「姓名」。");
  }
  if (indexes.grossCents < 0) {
    throw new PayrollCsvError("缺少应发金额列。", "PAYROLL_CSV_INVALID", "表头加「应发」。");
  }

  const rows: HrCsvRow[] = [];
  for (let lineNo = 1; lineNo < lines.length; lineNo += 1) {
    const cells = parseCsvLine(lines[lineNo]);
    const cell = (field: string) => (indexes[field] >= 0 ? cells[indexes[field]] ?? "" : "");
    const personName = text(cell("personName")) || text(cell("personCode"));
    const personCode = text(cell("personCode")) || personName;
    if (!personCode) {
      throw new PayrollCsvError(`第 ${lineNo + 1} 行缺少人员。`, "PAYROLL_CSV_INVALID", "填人员编号或姓名。");
    }
    const grossCents = yuanTextToCents(cell("grossCents"));
    if (grossCents <= 0) {
      throw new PayrollCsvError(`第 ${lineNo + 1} 行应发须大于 0。`, "PAYROLL_CSV_INVALID", "检查应发列。");
    }
    rows.push({
      personCode,
      personName: personName || personCode,
      grossCents,
      employeeSiCents: yuanTextToCents(cell("employeeSiCents")),
      housingFundCents: yuanTextToCents(cell("housingFundCents")),
      otherDeductionCents: yuanTextToCents(cell("otherDeductionCents")),
      employerSiCents: yuanTextToCents(cell("employerSiCents")),
      employerHfCents: yuanTextToCents(cell("employerHfCents")),
    });
  }
  return rows;
}

export function parseBureauTaxCsv(source: string): BureauCsvRow[] {
  const lines = splitCsvRows(source);
  if (lines.length < 2) {
    throw new PayrollCsvError("CSV 至少需要表头和一行明细。", "PAYROLL_CSV_INVALID", "补全表头与数据行。");
  }
  const headers = parseCsvLine(lines[0]);
  const indexes = buildIndex(headers, bureauAliases);
  if (indexes.personCode < 0 && indexes.personName < 0) {
    throw new PayrollCsvError("缺少人员编号或姓名列。", "PAYROLL_CSV_INVALID", "表头加「人员编号」或「姓名」。");
  }
  if (indexes.bureauTaxCents < 0) {
    throw new PayrollCsvError("缺少个税列。", "PAYROLL_CSV_INVALID", "表头加「本期个税」或「税额」。");
  }

  const rows: BureauCsvRow[] = [];
  for (let lineNo = 1; lineNo < lines.length; lineNo += 1) {
    const cells = parseCsvLine(lines[lineNo]);
    const cell = (field: string) => (indexes[field] >= 0 ? cells[indexes[field]] ?? "" : "");
    const personName = text(cell("personName"));
    const personCode = text(cell("personCode")) || personName;
    if (!personCode) {
      throw new PayrollCsvError(`第 ${lineNo + 1} 行缺少人员。`, "PAYROLL_CSV_INVALID", "填人员编号或姓名。");
    }
    rows.push({
      personCode,
      personName,
      bureauTaxCents: yuanTextToCents(cell("bureauTaxCents")),
      reason: text(cell("reason")),
    });
  }
  return rows;
}

export const hrCsvTemplate = `人员编号,姓名,应发,个人社保,个人公积金,其他扣款
E001,张三,10000,1000,500,0
`;

export const bureauCsvTemplate = `人员编号,本期个税,差异原因
E001,105,
`;
