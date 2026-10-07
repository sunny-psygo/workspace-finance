export type BalanceRow = {
  code: string;
  name: string;
  debitCents: number;
  creditCents: number;
  balanceCents: number;
};

export type User = {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
};

export type Claim = {
  id: string;
  status: string;
  revision: number;
  purpose: string;
  applicant?: string;
  totalCents: number;
  paidCents?: number;
  entryId?: string | null;
  paymentEntryId?: string | null;
  items?: Array<{
    id: string;
    memo: string;
    attachments?: Array<{ id: string; fileName: string }>;
  }>;
  allocations?: Array<{
    id: string;
    cents: number;
    voucherNo: string;
    reversedAt?: string | null;
  }>;
};

export type Statement = {
  id: string;
  reference: string;
  cents: number;
  remainingCents: number;
  bankAccountCode: string;
  paidOn: string;
};

export type BankRecon = {
  bankAccountCode: string;
  bookBalanceCents: number;
  statementTotalCents: number;
  matchedCents: number;
  unmatchedCents: number;
  openPayableCents: number;
  unmatchedStatements: Array<{
    id: string;
    reference: string;
    paidOn: string;
    cents: number;
    remainingCents: number;
    counterparty: string;
  }>;
  openClaims: Array<{
    id: string;
    purpose: string;
    payeeName: string;
    totalCents: number;
    paidCents: number;
    unpaidCents: number;
    occurredOn: string;
  }>;
};

export type PayrollBatch = {
  id: string;
  period: string;
  status: string;
  revision: number;
  grossCents: number;
  taxCents: number;
  netCents: number;
  paidCents: number;
  lines?: Array<{
    personCode: string;
    personName: string;
    netCents: number;
    estimatedTaxCents: number;
    confirmedTaxCents: number;
    bureauTaxCents?: number | null;
  }>;
};

export type FixedAsset = {
  id: string;
  code: string;
  name: string;
  startOn: string;
  costCents: number;
  residualRatePercent: number;
  usefulMonths: number;
  status: string;
  accumDepCents: number;
  depreciations?: Array<{ yearMonth: string; cents: number }>;
};

export type ReportLine = { key: string; label: string; cents: number; indent?: number };

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
  references: Array<{ type: string; id: string; label: string }>;
  attachments: Array<{ id: string; documentType: string; fileName: string }>;
};

export type CloseChecklist = {
  yearMonth: string;
  closed: boolean;
  ready: boolean;
  gaps: Array<{ code: string; count: number; samples: string[]; next: string }>;
};

export type PanelProps = {
  bookId: string;
  roles: string[];
  onNotice: (message: string) => void;
  onLedgerChanged?: () => void | Promise<void>;
};
