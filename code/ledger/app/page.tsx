"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BalanceRow = {
  code: string;
  name: string;
  debitCents: number;
  creditCents: number;
  balanceCents: number;
};

type User = {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
};

type Claim = {
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
  // attachments links use /api/attachments/:id
  allocations?: Array<{
    id: string;
    cents: number;
    voucherNo: string;
    reversedAt?: string | null;
  }>;
};

type Statement = {
  id: string;
  reference: string;
  cents: number;
  remainingCents: number;
  bankAccountCode: string;
  paidOn: string;
};

type BankRecon = {
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

type PayrollBatch = {
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

type FixedAsset = {
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

type ReportLine = { key: string; label: string; cents: number; indent?: number };

type BalanceSheet = {
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

type IncomeStatement = {
  yearMonth: string;
  lines: ReportLine[];
  incomeTotalCents: number;
  expenseTotalCents: number;
  profitCents: number;
};

function yuan(cents: number) {
  return (cents / 100).toFixed(2);
}

async function call<T>(url: string, body?: unknown, method = body ? "POST" : "GET"): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(`${payload.message} ${payload.next ?? ""}`);
  return payload;
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [bookId, setBookId] = useState("");
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [claimFilter, setClaimFilter] = useState("all");
  const [books, setBooks] = useState<Array<{ id: string; name: string }>>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [recon, setRecon] = useState<BankRecon | null>(null);
  const [payrollBatches, setPayrollBatches] = useState<PayrollBatch[]>([]);
  const [payroll, setPayroll] = useState<PayrollBatch | null>(null);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [balanceSheetReport, setBalanceSheetReport] = useState<BalanceSheet | null>(null);
  const [incomeReport, setIncomeReport] = useState<IncomeStatement | null>(null);
  const [users, setUsers] = useState<Array<User & { active: boolean }>>([]);
  const [notice, setNotice] = useState("先登录。演示账号见页面底部。");

  useEffect(() => {
    call<{ user: User }>("/api/auth/me")
      .then(async (payload) => {
        setUser(payload.user);
        const booksPayload = await call<{ books: Array<{ id: string; name: string }> }>("/api/books");
        setBooks(booksPayload.books);
        if (booksPayload.books[0] && !bookId) {
          await selectBook(booksPayload.books[0].id);
        }
      })
      .catch(() => setUser(null));
    // 仅首屏恢复会话
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await call<{ user: User }>("/api/auth/login", {
      username: form.get("username"),
      password: form.get("password"),
    });
    setUser(payload.user);
    setNotice(`已登录：${payload.user.displayName}（${payload.user.roles.join(",")}）`);
    await refreshBooks();
  }

  async function doLogout() {
    await call("/api/auth/logout", {});
    setUser(null);
    setNotice("已退出。");
  }

  async function openBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await call<{ book: { id: string } }>("/api/books", { name: form.get("name") });
    setBookId(payload.book.id);
    setNotice(`账套已建立：${payload.book.id}`);
    await refreshBooks();
    await refreshClaims(payload.book.id);
  }

  async function refreshBooks() {
    const payload = await call<{ books: Array<{ id: string; name: string }> }>("/api/books");
    setBooks(payload.books);
  }

  async function refreshClaims(id = bookId, status = claimFilter) {
    if (!id) return;
    const queuePayload = await call<{ claims: Claim[] }>(`/api/claims?bookId=${encodeURIComponent(id)}&queue=1`);
    setClaims(queuePayload.claims);
    const statusQuery = status && status !== "all" ? `&status=${encodeURIComponent(status)}` : "";
    const allPayload = await call<{ claims: Claim[] }>(`/api/claims?bookId=${encodeURIComponent(id)}${statusQuery}`);
    setAllClaims(allPayload.claims);
  }

  async function refreshPayrollFor(id = bookId) {
    if (!id) return;
    const payload = await call<{ batches: PayrollBatch[] }>(`/api/books/${id}/payroll/batches`);
    setPayrollBatches(payload.batches);
  }

  async function refreshFixedAssetsFor(id = bookId) {
    if (!id) return;
    const payload = await call<{ assets: FixedAsset[] }>(`/api/books/${id}/fixed-assets`);
    setFixedAssets(payload.assets);
  }

  async function selectBook(id: string) {
    setBookId(id);
    setClaim(null);
    setPayroll(null);
    setNotice(`当前账套：${id}`);
    await refreshBalanceFor(id);
    await refreshClaims(id);
    await refreshStatementsFor(id);
    await refreshReconFor(id);
    await refreshPayrollFor(id);
    await refreshFixedAssetsFor(id);
  }

  async function refreshReconFor(id = bookId) {
    if (!id) return;
    const payload = await call<{ summary: BankRecon }>(
      `/api/books/${id}/bank-reconciliation?bankAccountCode=1002`,
    );
    setRecon(payload.summary);
  }

  async function refreshBalanceFor(id: string) {
    const payload = await call<{ rows: BalanceRow[] }>(`/api/books/${id}/trial-balance`);
    setRows(payload.rows);
  }

  async function refreshStatementsFor(id: string) {
    const payload = await call<{ statements: Statement[] }>(`/api/books/${id}/statements`);
    setStatements(payload.statements);
  }

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await call(`/api/books/${bookId}/accounts`, {
      code: form.get("code"),
      name: form.get("name"),
      kind: form.get("kind"),
    });
    setNotice("账户已建立。");
    await refreshBalance();
  }

  async function createClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Math.round(Number(form.get("amount")) * 100);
    const payload = await call<{ claim: Claim }>("/api/claims", {
      bookId,
      department: form.get("department"),
      costCenter: form.get("costCenter"),
      payeeName: form.get("payeeName"),
      payeeAccount: form.get("payeeAccount"),
      bankName: form.get("bankName"),
      purpose: form.get("purpose"),
      occurredOn: form.get("occurredOn"),
      expenseAccountCode: form.get("expenseAccountCode") || "5602",
      payableAccountCode: form.get("payableAccountCode") || "2241",
      items: [{
        memo: String(form.get("itemMemo") || form.get("purpose")),
        cents: amount,
        invoiceNo: String(form.get("invoiceNo") || ""),
      }],
    });
    const itemId = payload.claim.items?.[0]?.id;
    let claim = payload.claim;
    if (itemId) {
      await call(`/api/claims/${claim.id}/items/${itemId}/attachments`, {
        fileName: String(form.get("attachmentName") || "发票.txt"),
        contentType: "text/plain",
        fileBase64: btoa(unescape(encodeURIComponent(String(form.get("attachmentText") || "invoice-demo")))),
      });
      const refreshed = await call<{ claim: Claim }>(`/api/claims/${claim.id}`);
      claim = refreshed.claim;
    }
    setClaim(claim);
    setNotice(`草稿已建并附票据：${claim.id}`);
    await refreshClaims();
  }

  async function runAction(action: string, remark?: string) {
    if (!claim) return;
    const payload = await call<{ claim: Claim }>(`/api/claims/${claim.id}/actions`, {
      action,
      expectedRevision: claim.revision,
      mutationId: `${action}-${claim.revision}-${Date.now()}`,
      remark,
    });
    setClaim(payload.claim);
    setNotice(`单据 ${payload.claim.status} · ${yuan(payload.claim.totalCents)} 元`);
    await refreshBalance();
    await refreshClaims();
  }

  async function importStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    const yuanAmount = Number(form.get("amount"));
    await call(`/api/books/${bookId}/statements`, {
      paidOn: form.get("paidOn"),
      cents: Math.round(yuanAmount * 100),
      bankAccountCode: form.get("bankAccountCode") || "1002",
      reference: form.get("reference"),
      counterparty: form.get("counterparty") || "",
      remark: form.get("remark") || "",
    });
    setNotice("银行流水已导入。");
    await refreshStatements();
    await refreshReconFor();
  }

  async function allocateClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!claim) return;
    const form = new FormData(event.currentTarget);
    const yuanAmount = Number(form.get("amount"));
    const payload = await call<{ claim: Claim }>(`/api/claims/${claim.id}/allocations`, {
      statementId: form.get("statementId"),
      cents: Math.round(yuanAmount * 100),
      expectedRevision: claim.revision,
      mutationId: `alloc-${claim.revision}-${Date.now()}`,
      remark: form.get("remark") || "匹配付款",
      voucherNo: form.get("voucherNo") || "",
      fileName: String(form.get("fileName") || "receipt.txt"),
      fileBase64: btoa(unescape(encodeURIComponent(String(form.get("fileText") || "payment-proof")))),
    });
    setClaim(payload.claim);
    setNotice(`已核销 ${yuan(payload.claim.paidCents || 0)} / ${yuan(payload.claim.totalCents)} 元`);
    await refreshBalance();
    await refreshStatements();
    await refreshClaims();
    await refreshReconFor();
  }

  async function reverseClaimAllocation(allocationId: string) {
    if (!claim) return;
    const remark = window.prompt("撤销原因", "配错流水") || "";
    if (!remark.trim()) {
      setNotice("撤销必须填写原因");
      return;
    }
    const payload = await call<{ claim: Claim }>(
      `/api/claims/${claim.id}/allocations/${allocationId}/reverse`,
      {
        expectedRevision: claim.revision,
        mutationId: `rev-${claim.revision}-${Date.now()}`,
        remark,
      },
    );
    setClaim(payload.claim);
    setNotice(`已撤销匹配，当前已付 ${yuan(payload.claim.paidCents || 0)} / ${yuan(payload.claim.totalCents)} 元`);
    await refreshBalance();
    await refreshStatements();
    await refreshClaims();
    await refreshReconFor();
  }

  async function refreshBalance() {
    if (!bookId) return;
    await refreshBalanceFor(bookId);
  }

  async function refreshStatements() {
    if (!bookId) return;
    await refreshStatementsFor(bookId);
  }

  async function closeMonth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    await call(`/api/books/${bookId}/periods/close`, {
      yearMonth: form.get("yearMonth"),
      remark: form.get("remark") || "结账",
    });
    setNotice(`已锁定期间 ${form.get("yearMonth")}（已结转损益）`);
    await refreshBalance();
  }

  async function reopenMonth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    await call(`/api/books/${bookId}/periods/reopen`, {
      yearMonth: form.get("yearMonth"),
      remark: form.get("remark") || "反结账",
    });
    setNotice(`已反结账 ${form.get("yearMonth")}（已红冲损益结转）`);
    await refreshBalance();
  }

  async function closeYearEnd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    await call(`/api/books/${bookId}/year-end/close`, {
      year: Number(form.get("year")),
      remark: form.get("remark") || "年末结转",
    });
    setNotice(`已年末结转 ${form.get("year")}`);
    await refreshBalance();
  }

  async function reopenYearEnd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    await call(`/api/books/${bookId}/year-end/reopen`, {
      year: Number(form.get("year")),
      remark: form.get("remark") || "撤销年结",
    });
    setNotice(`已撤销年末结转 ${form.get("year")}`);
    await refreshBalance();
  }

  async function createPayroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    const period = String(form.get("period") || "2026-01");
    const created = await call<{ batch: PayrollBatch }>(`/api/books/${bookId}/payroll/batches`, {
      period,
      mutationId: `pb-ui-${Date.now()}`,
    });
    const csv = String(form.get("csv") || "").trim();
    let withLines: { batch: PayrollBatch };
    if (csv) {
      withLines = await call<{ batch: PayrollBatch }>(
        `/api/payroll/batches/${created.batch.id}/lines-csv`,
        {
          expectedRevision: created.batch.revision,
          mutationId: `pb-csv-ui-${Date.now()}`,
          csv,
        },
        "PUT",
      );
    } else {
      const grossYuan = Number(form.get("grossYuan") || 0);
      const siYuan = Number(form.get("siYuan") || 0);
      const hfYuan = Number(form.get("hfYuan") || 0);
      withLines = await call<{ batch: PayrollBatch }>(
        `/api/payroll/batches/${created.batch.id}/lines`,
        {
          expectedRevision: created.batch.revision,
          mutationId: `pb-lines-ui-${Date.now()}`,
          lines: [
            {
              personCode: String(form.get("personCode") || "E001"),
              personName: String(form.get("personName") || "张三"),
              grossCents: Math.round(grossYuan * 100),
              employeeSiCents: Math.round(siYuan * 100),
              housingFundCents: Math.round(hfYuan * 100),
            },
          ],
        },
        "PUT",
      );
    }
    setPayroll(withLines.batch);
    setNotice(`工资批次已试算，个税 ${yuan(withLines.batch.taxCents)}，实发 ${yuan(withLines.batch.netCents)}`);
    await refreshPayrollFor();
  }

  async function payrollConfirmTax() {
    if (!payroll) return;
    const payload = await call<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/confirm-tax`, {
      expectedRevision: payroll.revision,
      mutationId: `pb-tax-ui-${Date.now()}`,
    });
    setPayroll(payload.batch);
    setNotice("个税已确认");
    await refreshPayrollFor();
  }

  async function payrollImportBureau(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payroll?.lines?.length) return;
    const form = new FormData(event.currentTarget);
    const csv = String(form.get("bureauCsv") || "").trim();
    let payload: { batch: PayrollBatch };
    if (csv) {
      payload = await call<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/bureau-tax-csv`, {
        expectedRevision: payroll.revision,
        mutationId: `pb-bureau-csv-${Date.now()}`,
        csv,
      });
    } else {
      const bureauYuan = Number(form.get("bureauYuan") || 0);
      const reason = String(form.get("reason") || "");
      const line = payroll.lines[0];
      const bureauCents = Math.round(bureauYuan * 100);
      payload = await call<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/bureau-tax`, {
        expectedRevision: payroll.revision,
        mutationId: `pb-bureau-ui-${Date.now()}`,
        results: [
          {
            personCode: line.personCode,
            bureauTaxCents: bureauCents,
            reason: bureauCents !== line.estimatedTaxCents ? reason || "扣缴端结果" : reason,
          },
        ],
      });
    }
    setPayroll(payload.batch);
    setNotice(`已导入税局个税并确认，实发 ${yuan(payload.batch.netCents)}`);
    await refreshPayrollFor();
  }

  async function saveOpeningTax(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    await call(`/api/books/${bookId}/payroll/opening-tax`, {
      year: Number(form.get("year") || 2026),
      mutationId: `open-ui-${Date.now()}`,
      lines: [
        {
          personCode: String(form.get("personCode") || "E001"),
          personName: String(form.get("personName") || "张三"),
          grossCents: Math.round(Number(form.get("grossYuan") || 0) * 100),
          siCents: Math.round(Number(form.get("siYuan") || 0) * 100),
          hfCents: Math.round(Number(form.get("hfYuan") || 0) * 100),
          taxCents: Math.round(Number(form.get("taxYuan") || 0) * 100),
        },
      ],
    }, "PUT");
    setNotice("期初累计已保存，下次试算会自动带入");
  }

  async function payrollPost() {
    if (!payroll) return;
    const payload = await call<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/post`, {
      expectedRevision: payroll.revision,
      mutationId: `pb-post-ui-${Date.now()}`,
    });
    setPayroll(payload.batch);
    setNotice("工资已过账");
    await refreshBalance();
    await refreshPayrollFor();
  }

  async function payrollPay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payroll) return;
    const form = new FormData(event.currentTarget);
    const payload = await call<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/payments`, {
      statementId: form.get("statementId"),
      cents: Math.round(Number(form.get("yuan") || 0) * 100),
      expectedRevision: payroll.revision,
      mutationId: `pb-pay-ui-${Date.now()}`,
    });
    setPayroll(payload.batch);
    setNotice(`工资付款 ${payload.batch.status}`);
    await refreshBalance();
    await refreshStatements();
    await refreshPayrollFor();
  }

  async function createFixedAssetCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    const payload = await call<{ asset: FixedAsset }>(`/api/books/${bookId}/fixed-assets`, {
      code: form.get("code"),
      name: form.get("name"),
      startOn: form.get("startOn"),
      costCents: Math.round(Number(form.get("costYuan") || 0) * 100),
      residualRatePercent: Number(form.get("residualRatePercent") || 5),
      usefulMonths: Number(form.get("usefulMonths") || 12),
      mutationId: `fa-create-ui-${Date.now()}`,
      remark: form.get("remark") || "",
    });
    setNotice(`资产已建卡：${payload.asset.code} ${payload.asset.name}`);
    await refreshFixedAssetsFor();
    await refreshBalance();
  }

  async function depreciateFixedAssets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    const yearMonth = String(form.get("yearMonth") || "");
    const payload = await call<{ yearMonth: string; depreciated: FixedAsset[] }>(
      `/api/books/${bookId}/fixed-assets/depreciate`,
      {
        yearMonth,
        mutationId: `fa-dep-ui-${Date.now()}`,
      },
    );
    setNotice(`${payload.yearMonth} 已计提 ${payload.depreciated.length} 项资产`);
    await refreshFixedAssetsFor();
    await refreshBalance();
  }

  async function disposeFixedAssetCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assetId = String(form.get("assetId") || "");
    const payload = await call<{ asset: FixedAsset }>(`/api/fixed-assets/${assetId}/dispose`, {
      occurredOn: form.get("occurredOn"),
      mutationId: `fa-dispose-ui-${Date.now()}`,
      remark: form.get("remark") || "处置",
    });
    setNotice(`资产已处置：${payload.asset.code}`);
    await refreshFixedAssetsFor();
    await refreshBalance();
  }

  async function loadBalanceSheet() {
    if (!bookId) return;
    const payload = await call<{ report: BalanceSheet }>(`/api/books/${bookId}/reports/balance-sheet`);
    setBalanceSheetReport(payload.report);
    setNotice(
      payload.report.balanced
        ? `资产负债表已刷新（勾稽平衡）`
        : `资产负债表不平衡：资产 ${yuan(payload.report.assetTotalCents)} ≠ 负债权益 ${yuan(payload.report.liabilityAndEquityTotalCents)}`,
    );
  }

  async function loadIncomeStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    const yearMonth = String(form.get("yearMonth") || "");
    const payload = await call<{ report: IncomeStatement }>(
      `/api/books/${bookId}/reports/income-statement?yearMonth=${encodeURIComponent(yearMonth)}`,
    );
    setIncomeReport(payload.report);
    setNotice(`${yearMonth} 利润总额 ${yuan(payload.report.profitCents)}`);
  }

  async function refreshUsers() {
    const payload = await call<{ users: Array<User & { active: boolean }> }>("/api/auth/users");
    setUsers(payload.users);
  }

  async function createManagedUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roles = String(form.get("roles") || "employee")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    await call("/api/auth/users", {
      username: form.get("username"),
      displayName: form.get("displayName"),
      password: form.get("password"),
      roles,
    });
    setNotice("账号已创建");
    await refreshUsers();
  }

  const roles = user?.roles ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">登录 · 附件 · 发票查重 · 审批 · 银行流水匹配</p>
          <h1 className="mt-1 text-3xl font-semibold">账本</h1>
          <p className="mt-2 text-stone-600">{notice}</p>
        </div>
        {user ? (
          <div className="text-right text-sm">
            <p>{user.displayName}</p>
            <p className="text-stone-500">{user.roles.join(", ")}</p>
            <form
              className="mt-2 space-y-1"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                await call("/api/auth/change-password", {
                  currentPassword: form.get("currentPassword"),
                  newPassword: form.get("newPassword"),
                });
                setUser(null);
                setNotice("密码已更新，请重新登录。");
              }}
            >
              <Input name="currentPassword" type="password" placeholder="当前密码" required />
              <Input name="newPassword" type="password" placeholder="新密码至少8位" required />
              <Button type="submit">改密</Button>
            </form>
            <Button className="mt-2" onClick={doLogout}>退出</Button>
          </div>
        ) : null}
      </header>

      {!user ? (
        <Card className="max-w-md">
          <form onSubmit={doLogin}>
            <CardTitle>登录</CardTitle>
            <Input className="mt-3" name="username" placeholder="用户名" required />
            <Input className="mt-2" name="password" type="password" placeholder="密码" required />
            <Button className="mt-3" type="submit">登录</Button>
          </form>
          <p className="mt-4 text-sm text-stone-500">
            演示：zhangsan / hr / finance / gm / cashier，密码均为 Passw0rd!
          </p>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <form onSubmit={openBook}>
                <CardTitle>开账（财务/总经理）</CardTitle>
                <Input className="mt-3" name="name" placeholder="创意考拉 2026" required />
                <Button className="mt-3" type="submit" disabled={!roles.includes("finance") && !roles.includes("gm")}>建立账套</Button>
              </form>
            </Card>
            <Card>
              <form onSubmit={addAccount}>
                <CardTitle>账户</CardTitle>
                <Input className="mt-3" name="code" placeholder="5602 / 2241 / 1002" required disabled={!bookId} />
                <Input className="mt-2" name="name" placeholder="科目名称" required disabled={!bookId} />
                <select className="mt-2 h-10 w-full rounded-md border border-stone-300 px-3 text-sm" name="kind" disabled={!bookId}>
                  <option value="expense">费用</option>
                  <option value="liability">负债</option>
                  <option value="asset">资产</option>
                  <option value="equity">权益</option>
                  <option value="income">收入</option>
                </select>
                <Button className="mt-3" disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>建立账户</Button>
              </form>
            </Card>
            <Card>
              <CardTitle>当前账套 / 结账</CardTitle>
              <p className="mt-3 break-all text-sm text-stone-600">{bookId || "尚未开账"}</p>
              <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-sm">
                {books.map((book) => (
                  <li key={book.id}>
                    <button type="button" className="text-left text-sky-700 underline" onClick={() => selectBook(book.id)}>
                      {book.name} · {book.id.slice(0, 8)}
                    </button>
                  </li>
                ))}
              </ul>
              <Button className="mt-3" disabled={!bookId} onClick={refreshBalance}>刷新试算</Button>
              <Button className="mt-3 ml-2" disabled={!bookId} onClick={() => refreshClaims()}>刷新待办</Button>
              <form className="mt-4" onSubmit={closeMonth}>
                <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-09" required disabled={!bookId} />
                <Input className="mt-2" name="remark" placeholder="结账说明" defaultValue="月结" disabled={!bookId} />
                <Button className="mt-2" disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>锁定期间</Button>
              </form>
              <form className="mt-3" onSubmit={reopenMonth}>
                <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-09" required disabled={!bookId} />
                <Input className="mt-2" name="remark" placeholder="反结账原因" defaultValue="补凭证" required disabled={!bookId} />
                <Button className="mt-2" disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>反结账</Button>
              </form>
              <form className="mt-4" onSubmit={closeYearEnd}>
                <Input name="year" placeholder="年份" defaultValue="2026" required disabled={!bookId} />
                <Input className="mt-2" name="remark" placeholder="年末结转说明" defaultValue="年结" disabled={!bookId} />
                <Button className="mt-2" disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>年末结转</Button>
              </form>
              <form className="mt-3" onSubmit={reopenYearEnd}>
                <Input name="year" placeholder="年份" defaultValue="2026" required disabled={!bookId} />
                <Input className="mt-2" name="remark" placeholder="撤销年结原因" defaultValue="改年结" required disabled={!bookId} />
                <Button className="mt-2" disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>撤销年结</Button>
              </form>
            </Card>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>待办单据（按当前角色）</CardTitle>
              <ul className="mt-3 space-y-2 text-sm">
                {claims.length === 0 ? <li className="text-stone-500">暂无待办</li> : null}
                {claims.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`text-left underline ${claim?.id === row.id ? "text-stone-900" : "text-sky-700"}`}
                      onClick={async () => {
                        const payload = await call<{ claim: Claim }>(`/api/claims/${row.id}`);
                        setClaim(payload.claim);
                        setNotice(`已选单据 ${payload.claim.status}`);
                      }}
                    >
                      {row.status} · {yuan(row.paidCents || 0)}/{yuan(row.totalCents)} · {row.purpose} · {row.id.slice(0, 8)}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardTitle>全部单据</CardTitle>
              <select
                className="mt-3 h-10 w-full rounded-md border border-stone-300 px-3 text-sm"
                value={claimFilter}
                disabled={!bookId}
                onChange={async (event) => {
                  const value = event.target.value;
                  setClaimFilter(value);
                  await refreshClaims(bookId, value);
                }}
              >
                <option value="all">全部状态</option>
                <option value="draft">draft</option>
                <option value="financeReview">financeReview</option>
                <option value="gmReview">gmReview</option>
                <option value="paymentVoucher">paymentVoucher</option>
                <option value="completed">completed</option>
                <option value="rejected">rejected</option>
                <option value="voided">voided</option>
              </select>
              <ul className="mt-3 max-h-48 space-y-2 overflow-auto text-sm">
                {allClaims.length === 0 ? <li className="text-stone-500">暂无单据</li> : null}
                {allClaims.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`text-left underline ${claim?.id === row.id ? "text-stone-900" : "text-sky-700"}`}
                      onClick={async () => {
                        const payload = await call<{ claim: Claim }>(`/api/claims/${row.id}`);
                        setClaim(payload.claim);
                        setNotice(`已选单据 ${payload.claim.status}`);
                      }}
                    >
                      {row.status} · {row.applicant || ""} · {yuan(row.totalCents)} · {row.purpose}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <form onSubmit={createClaim}>
                <CardTitle>报销草稿（员工）</CardTitle>
                <Input className="mt-3" name="department" placeholder="部门" defaultValue="行政" required disabled={!bookId} />
                <Input className="mt-2" name="costCenter" placeholder="费用归属" defaultValue="公司公共" required disabled={!bookId} />
                <Input className="mt-2" name="payeeName" placeholder="收款人" defaultValue="张三" required disabled={!bookId} />
                <Input className="mt-2" name="payeeAccount" placeholder="收款账号" defaultValue="6222000000000001" required disabled={!bookId} />
                <Input className="mt-2" name="bankName" placeholder="开户行" defaultValue="测试银行" required disabled={!bookId} />
                <Input className="mt-2" name="purpose" placeholder="事由" defaultValue="办公用品" required disabled={!bookId} />
                <Input className="mt-2" name="itemMemo" placeholder="明细说明" defaultValue="打印纸" required disabled={!bookId} />
                <Input className="mt-2" name="invoiceNo" placeholder="发票号（可空）" defaultValue={`INV-${Date.now().toString().slice(-8)}`} disabled={!bookId} />
                <Input className="mt-2" name="occurredOn" type="date" required disabled={!bookId} />
                <Input className="mt-2" name="amount" placeholder="金额（元）" defaultValue="128" required disabled={!bookId} />
                <Input className="mt-2" name="expenseAccountCode" defaultValue="5602" disabled={!bookId} />
                <Input className="mt-2" name="payableAccountCode" defaultValue="2241" disabled={!bookId} />
                <Input className="mt-2" name="attachmentName" placeholder="附件名" defaultValue="发票.txt" required disabled={!bookId} />
                <Input className="mt-2" name="attachmentText" placeholder="附件内容（演示）" defaultValue="invoice-demo" required disabled={!bookId} />
                <Button className="mt-3" disabled={!bookId || !roles.includes("employee")}>保存草稿并上传附件</Button>
              </form>
            </Card>
            <Card>
              <CardTitle>审批</CardTitle>
              <p className="mt-3 text-sm text-stone-600">
                {claim
                  ? `当前 ${claim.status} · revision ${claim.revision} · 已付 ${yuan(claim.paidCents || 0)} / ${yuan(claim.totalCents)} 元`
                  : "先保存草稿"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button disabled={!claim || !roles.includes("employee") || (claim.status !== "draft" && claim.status !== "rejected")} onClick={() => runAction("submit")}>提交财务</Button>
                <Button disabled={!claim || !roles.includes("finance") || claim.status !== "financeReview"} onClick={() => runAction("financeApprove", "票据齐全")}>财务通过</Button>
                <Button disabled={!claim || !roles.includes("gm") || claim.status !== "gmReview"} onClick={() => runAction("gmApprove", "同意")}>总经理通过并入账</Button>
                <Button disabled={!claim || (!roles.includes("finance") && !roles.includes("gm")) || (claim.status !== "financeReview" && claim.status !== "gmReview")} onClick={() => runAction("reject", "资料不全")}>驳回</Button>
                <Button disabled={!claim || !roles.includes("gm") || claim.status !== "paymentVoucher" || (claim.paidCents || 0) > 0} onClick={() => runAction("void", "作废")}>作废并红冲</Button>
              </div>
              {claim?.items?.[0]?.attachments?.length
                ? (
                  <p className="mt-3 text-sm">
                    明细附件：
                    {claim.items[0].attachments.map((a) => (
                      <a key={a.id} className="ml-2 text-sky-700 underline" href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer">
                        {a.fileName}
                      </a>
                    ))}
                  </p>
                )
                : claim ? <p className="mt-3 text-sm text-amber-700">还没有明细附件，提交会被拒绝</p> : null}
              {claim?.entryId ? <p className="mt-1 text-sm">应付分录：{claim.entryId}</p> : null}
              {claim?.paymentEntryId ? <p className="mt-1 text-sm">付款分录：{claim.paymentEntryId}</p> : null}
            </Card>
          </section>

          <section className="mt-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>银行调节（1002）</CardTitle>
                <Button type="button" disabled={!bookId} onClick={() => refreshReconFor()}>刷新调节</Button>
              </div>
              {recon ? (
                <>
                  <p className="mt-3 text-sm text-stone-700">
                    账面 {yuan(recon.bookBalanceCents)} · 流水合计 {yuan(recon.statementTotalCents)} ·
                    已匹配 {yuan(recon.matchedCents)} · 未匹配 {yuan(recon.unmatchedCents)} ·
                    待付应付 {yuan(recon.openPayableCents)}
                  </p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm text-stone-600">
                    <div>
                      <p className="font-medium text-stone-800">未匹配流水</p>
                      <ul className="mt-1 space-y-1">
                        {recon.unmatchedStatements.length === 0 ? <li>无</li> : null}
                        {recon.unmatchedStatements.map((row) => (
                          <li key={row.id}>
                            {row.reference} · 剩余 {yuan(row.remainingCents)} / {yuan(row.cents)} · {row.counterparty || "—"}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">待付款单据</p>
                      <ul className="mt-1 space-y-1">
                        {recon.openClaims.length === 0 ? <li>无</li> : null}
                        {recon.openClaims.map((row) => (
                          <li key={row.id}>
                            {row.purpose} · 未付 {yuan(row.unpaidCents)} · {row.payeeName} · {row.id.slice(0, 8)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-stone-500">选择账套后显示调节汇总。</p>
              )}
            </Card>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <form onSubmit={importStatement}>
                <CardTitle>导入银行流水（出纳/财务）</CardTitle>
                <Input className="mt-3" name="reference" placeholder="流水号" defaultValue="BANK20261004001" required disabled={!bookId} />
                <Input className="mt-2" name="paidOn" type="date" required disabled={!bookId} />
                <Input className="mt-2" name="amount" placeholder="支出金额（元）" defaultValue="128" required disabled={!bookId} />
                <Input className="mt-2" name="bankAccountCode" defaultValue="1002" required disabled={!bookId} />
                <Input className="mt-2" name="counterparty" placeholder="对方" defaultValue="张三" disabled={!bookId} />
                <Input className="mt-2" name="remark" placeholder="摘要" defaultValue="报销付款" disabled={!bookId} />
                <Button className="mt-3" disabled={!bookId || (!roles.includes("cashier") && !roles.includes("finance"))} type="submit">导入</Button>
                <Button className="mt-3 ml-2" disabled={!bookId} type="button" onClick={refreshStatements}>刷新流水</Button>
              </form>
              <ul className="mt-3 space-y-1 text-sm text-stone-600">
                {statements.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-2">
                    <span>{row.reference} · 剩余 {yuan(row.remainingCents)} / {yuan(row.cents)} · {row.id.slice(0, 8)}</span>
                    {row.remainingCents === row.cents && (roles.includes("cashier") || roles.includes("finance")) ? (
                      <Button
                        type="button"
                        onClick={async () => {
                          const remark = window.prompt("作废原因", "导错流水") || "";
                          if (!remark.trim()) {
                            setNotice("作废必须填写原因");
                            return;
                          }
                          await call(`/api/books/${bookId}/statements/${row.id}/void`, { remark });
                          setNotice(`已作废流水 ${row.reference}`);
                          await refreshStatements();
                          await refreshReconFor();
                        }}
                      >
                        作废
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <form onSubmit={allocateClaim}>
                <CardTitle>匹配付款（出纳）</CardTitle>
                <Input className="mt-3" name="statementId" placeholder="流水 id" required disabled={!claim} />
                <Input className="mt-2" name="amount" placeholder="本次核销（元）" defaultValue="60" required disabled={!claim} />
                <Input className="mt-2" name="voucherNo" placeholder="回单号（可空）" disabled={!claim} />
                <Input className="mt-2" name="remark" placeholder="说明" defaultValue="匹配付款" disabled={!claim} />
                <Input className="mt-2" name="fileName" placeholder="回单文件名" defaultValue="receipt.txt" disabled={!claim} />
                <Input className="mt-2" name="fileText" placeholder="回单文本（演示）" defaultValue="payment-proof" disabled={!claim} />
                <Button className="mt-3" disabled={!claim || !roles.includes("cashier") || claim.status !== "paymentVoucher"}>匹配并核销</Button>
              </form>
              {claim?.allocations?.length ? (
                <ul className="mt-3 space-y-1 text-sm text-stone-600">
                  {claim.allocations.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center gap-2">
                      <span>
                        {yuan(row.cents)} · {row.voucherNo || row.id.slice(0, 8)}
                        {row.reversedAt ? " · 已撤销" : ""}
                      </span>
                      {!row.reversedAt && roles.includes("cashier") && (claim.status === "paymentVoucher" || claim.status === "completed") ? (
                        <Button type="button" onClick={() => reverseClaimAllocation(row.id)}>撤销</Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </section>

          {roles.includes("gm") ? (
            <section className="mt-6">
              <Card>
                <form onSubmit={createManagedUser}>
                  <CardTitle>账号管理（总经理）</CardTitle>
                  <Input className="mt-3" name="username" placeholder="用户名" required />
                  <Input className="mt-2" name="displayName" placeholder="显示名" required />
                  <Input className="mt-2" name="password" type="password" placeholder="初始密码至少8位" required />
                  <Input className="mt-2" name="roles" placeholder="角色，逗号分隔" defaultValue="employee" required />
                  <Button className="mt-3" type="submit">创建账号</Button>
                  <Button className="mt-3 ml-2" type="button" onClick={refreshUsers}>刷新列表</Button>
                </form>
                <ul className="mt-3 space-y-1 text-sm">
                  {users.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center gap-2">
                      <span>{row.username} · {row.displayName} · {row.roles.join(",")} · {row.active ? "启用" : "停用"}</span>
                      <Button
                        type="button"
                        onClick={async () => {
                          await call(`/api/auth/users/${row.id}/active`, { active: !row.active });
                          await refreshUsers();
                        }}
                      >
                        {row.active ? "停用" : "启用"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>工资批次</CardTitle>
              <form className="mt-3" onSubmit={createPayroll}>
                <Input name="period" placeholder="YYYY-MM" defaultValue="2026-01" required disabled={!bookId} />
                <Input className="mt-2" name="personCode" placeholder="人员编号" defaultValue="E001" disabled={!bookId} />
                <Input className="mt-2" name="personName" placeholder="姓名" defaultValue="张三" disabled={!bookId} />
                <Input className="mt-2" name="grossYuan" placeholder="应发（元）" defaultValue="10000" disabled={!bookId} />
                <Input className="mt-2" name="siYuan" placeholder="个人社保（元）" defaultValue="1000" disabled={!bookId} />
                <Input className="mt-2" name="hfYuan" placeholder="个人公积金（元）" defaultValue="500" disabled={!bookId} />
                <textarea
                  className="mt-2 h-24 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  name="csv"
                  placeholder={"多人可粘贴 CSV：\n人员编号,姓名,应发,个人社保,个人公积金,其他扣款\nE001,张三,10000,1000,500,0"}
                  disabled={!bookId}
                />
                <Button
                  className="mt-3"
                  disabled={!bookId || (!roles.includes("hr") && !roles.includes("finance") && !roles.includes("gm"))}
                >
                  创建并试算
                </Button>
              </form>
              <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-sm">
                {payrollBatches.length === 0 ? <li className="text-stone-500">暂无工资批次</li> : null}
                {payrollBatches.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`text-left underline ${payroll?.id === row.id ? "text-stone-900" : "text-sky-700"}`}
                      onClick={async () => {
                        const payload = await call<{ batch: PayrollBatch }>(`/api/payroll/batches/${row.id}`);
                        setPayroll(payload.batch);
                        setNotice(`已选工资 ${payload.batch.period} ${payload.batch.status}`);
                      }}
                    >
                      {row.period} · {row.status} · 实发 {yuan(row.netCents)} · 已付 {yuan(row.paidCents)}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardTitle>工资处理</CardTitle>
              {payroll ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    {payroll.period} · {payroll.status} · 应发 {yuan(payroll.grossCents)} · 个税 {yuan(payroll.taxCents)} · 实发{" "}
                    {yuan(payroll.netCents)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={(!roles.includes("finance") && !roles.includes("gm")) || payroll.status !== "calculated"}
                      onClick={payrollConfirmTax}
                    >
                      按试算确认
                    </Button>
                    <Button
                      disabled={(!roles.includes("finance") && !roles.includes("gm")) || payroll.status !== "taxVerified"}
                      onClick={payrollPost}
                    >
                      过账
                    </Button>
                  </div>
                  <form className="mt-2 space-y-2" onSubmit={payrollImportBureau}>
                    <p className="text-stone-500">
                      试算个税 {yuan(payroll.lines?.[0]?.estimatedTaxCents ?? payroll.taxCents)}
                      {payroll.lines?.[0]?.bureauTaxCents != null
                        ? ` · 税局 ${yuan(payroll.lines[0].bureauTaxCents)}`
                        : ""}
                    </p>
                    <Input
                      name="bureauYuan"
                      placeholder="税局个税（元，单人）"
                      defaultValue={((payroll.lines?.[0]?.estimatedTaxCents ?? payroll.taxCents) / 100).toFixed(2)}
                      disabled={payroll.status !== "calculated" && payroll.status !== "taxVerified"}
                    />
                    <Input name="reason" placeholder="与试算不同时的原因" disabled={payroll.status !== "calculated" && payroll.status !== "taxVerified"} />
                    <textarea
                      className="h-20 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                      name="bureauCsv"
                      placeholder={"多人可粘贴 CSV：\n人员编号,本期个税,差异原因\nE001,105,"}
                      disabled={payroll.status !== "calculated" && payroll.status !== "taxVerified"}
                    />
                    <Button
                      disabled={
                        (!roles.includes("finance") && !roles.includes("gm")) ||
                        (payroll.status !== "calculated" && payroll.status !== "taxVerified")
                      }
                    >
                      导入税局并确认
                    </Button>
                  </form>
                  <form className="mt-2" onSubmit={payrollPay}>
                    <Input name="statementId" placeholder="银行流水 id" required disabled={payroll.status !== "posted" && payroll.status !== "paid"} />
                    <Input
                      className="mt-2"
                      name="yuan"
                      placeholder="付款金额（元）"
                      defaultValue={(Math.max(0, payroll.netCents - payroll.paidCents) / 100).toFixed(2)}
                      disabled={payroll.status !== "posted" && payroll.status !== "paid"}
                    />
                    <Button
                      className="mt-2"
                      disabled={
                        (!roles.includes("cashier") && !roles.includes("finance")) ||
                        (payroll.status !== "posted" && payroll.status !== "paid")
                      }
                    >
                      匹配流水付实发
                    </Button>
                  </form>
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-500">先创建或选择左侧批次。</p>
              )}
              <form className="mt-4 border-t border-stone-200 pt-3" onSubmit={saveOpeningTax}>
                <p className="text-sm font-medium">个税期初累计（财务）</p>
                <Input className="mt-2" name="year" placeholder="年份" defaultValue="2026" disabled={!bookId} />
                <Input className="mt-2" name="personCode" placeholder="人员编号" defaultValue="E001" disabled={!bookId} />
                <Input className="mt-2" name="personName" placeholder="姓名" defaultValue="张三" disabled={!bookId} />
                <Input className="mt-2" name="grossYuan" placeholder="累计应发（元）" defaultValue="0" disabled={!bookId} />
                <Input className="mt-2" name="siYuan" placeholder="累计个人社保（元）" defaultValue="0" disabled={!bookId} />
                <Input className="mt-2" name="hfYuan" placeholder="累计个人公积金（元）" defaultValue="0" disabled={!bookId} />
                <Input className="mt-2" name="taxYuan" placeholder="累计已扣个税（元）" defaultValue="0" disabled={!bookId} />
                <Button className="mt-2" disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>
                  保存期初
                </Button>
              </form>
            </Card>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>固定资产</CardTitle>
              <form className="mt-3 space-y-2" onSubmit={createFixedAssetCard}>
                <Input name="code" placeholder="资产编号" defaultValue="FA-001" required disabled={!bookId} />
                <Input name="name" placeholder="资产名称" defaultValue="办公电脑" required disabled={!bookId} />
                <Input name="startOn" placeholder="启用日 YYYY-MM-DD" defaultValue="2026-01-10" required disabled={!bookId} />
                <Input name="costYuan" placeholder="原值（元）" defaultValue="1200" required disabled={!bookId} />
                <Input name="residualRatePercent" placeholder="残值率 %" defaultValue="5" disabled={!bookId} />
                <Input name="usefulMonths" placeholder="使用月数" defaultValue="12" disabled={!bookId} />
                <Input name="remark" placeholder="备注" defaultValue="购置" disabled={!bookId} />
                <Button disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>建卡入账</Button>
              </form>
              <form className="mt-4 space-y-2 border-t border-stone-200 pt-3" onSubmit={depreciateFixedAssets}>
                <p className="text-sm font-medium">月折旧（次月起提）</p>
                <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-02" required disabled={!bookId} />
                <Button disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>计提本月应提</Button>
              </form>
              <ul className="mt-4 max-h-48 space-y-1 overflow-auto text-sm">
                {fixedAssets.length === 0 ? <li className="text-stone-500">暂无资产卡片</li> : null}
                {fixedAssets.map((row) => (
                  <li key={row.id}>
                    {row.code} · {row.name} · {row.status} · 原值 {yuan(row.costCents)} · 累计折旧 {yuan(row.accumDepCents)} · 已提{" "}
                    {row.depreciations?.length ?? 0}/{row.usefulMonths} 期
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardTitle>资产处置</CardTitle>
              <form className="mt-3 space-y-2" onSubmit={disposeFixedAssetCard}>
                <select
                  className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm"
                  name="assetId"
                  disabled={!bookId || fixedAssets.filter((row) => row.status === "active").length === 0}
                  defaultValue=""
                >
                  <option value="" disabled>
                    选择在用资产
                  </option>
                  {fixedAssets
                    .filter((row) => row.status === "active")
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.code} · {row.name}
                      </option>
                    ))}
                </select>
                <Input name="occurredOn" placeholder="处置日 YYYY-MM-DD" defaultValue="2026-03-20" required disabled={!bookId} />
                <Input name="remark" placeholder="处置说明" defaultValue="报废" required disabled={!bookId} />
                <Button disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>处置（当月先提后处置）</Button>
              </form>
              <p className="mt-3 text-sm text-stone-500">
                购置借 1601 / 贷 2241；折旧借 5602 / 贷 1602；应提未提会阻断该月结账。
              </p>
            </Card>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>资产负债表</CardTitle>
              <Button className="mt-3" disabled={!bookId} onClick={loadBalanceSheet}>
                刷新资产负债表
              </Button>
              {balanceSheetReport ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p className={balanceSheetReport.balanced ? "text-emerald-700" : "text-red-700"}>
                    {balanceSheetReport.balanced ? "勾稽平衡" : "勾稽不平衡"} · {balanceSheetReport.asOf}
                  </p>
                  <p className="font-medium">资产</p>
                  <ul>
                    {balanceSheetReport.assets.map((row) => (
                      <li key={row.key} className="flex justify-between gap-2">
                        <span>{row.label}</span>
                        <span>{yuan(row.cents)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between border-t pt-1 font-medium">
                      <span>资产合计</span>
                      <span>{yuan(balanceSheetReport.assetTotalCents)}</span>
                    </li>
                  </ul>
                  <p className="font-medium">负债</p>
                  <ul>
                    {balanceSheetReport.liabilities.map((row) => (
                      <li key={row.key} className="flex justify-between gap-2">
                        <span>{row.label}</span>
                        <span>{yuan(row.cents)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between border-t pt-1 font-medium">
                      <span>负债合计</span>
                      <span>{yuan(balanceSheetReport.liabilityTotalCents)}</span>
                    </li>
                  </ul>
                  <p className="font-medium">所有者权益</p>
                  <ul>
                    {balanceSheetReport.equity.map((row) => (
                      <li key={row.key} className="flex justify-between gap-2">
                        <span>{row.label}</span>
                        <span>{yuan(row.cents)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between border-t pt-1 font-medium">
                      <span>负债和权益合计</span>
                      <span>{yuan(balanceSheetReport.liabilityAndEquityTotalCents)}</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-500">点刷新从试算派生。</p>
              )}
            </Card>
            <Card>
              <CardTitle>利润表</CardTitle>
              <form className="mt-3 space-y-2" onSubmit={loadIncomeStatement}>
                <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-02" required disabled={!bookId} />
                <Button disabled={!bookId}>刷新利润表</Button>
              </form>
              {incomeReport ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {incomeReport.lines.map((row) => (
                    <li key={row.key} className={`flex justify-between gap-2 ${row.indent ? "" : "font-medium"}`}>
                      <span>{row.label}</span>
                      <span>{yuan(row.cents)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-stone-500">选期间后刷新；口径与结账相同。</p>
              )}
            </Card>
          </section>

          <section className="mt-8 overflow-hidden rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-100">
                <tr>
                  <th className="px-4 py-3">科目</th>
                  <th className="px-4 py-3">名称</th>
                  <th className="px-4 py-3">借方</th>
                  <th className="px-4 py-3">贷方</th>
                  <th className="px-4 py-3">余额</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.code} className="border-t">
                    <td className="px-4 py-3">{row.code}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{yuan(row.debitCents)}</td>
                    <td className="px-4 py-3">{yuan(row.creditCents)}</td>
                    <td className="px-4 py-3">{yuan(row.balanceCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
