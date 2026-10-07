"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiCall, hasRole, yuan } from "./api";
import type { Claim, PanelProps } from "./types";

export function ClaimsPanel({
  bookId,
  roles,
  claim,
  claims,
  allClaims,
  claimFilter,
  onNotice,
  onClaimChange,
  onFilterChange,
  onLedgerChanged,
}: PanelProps & {
  claim: Claim | null;
  claims: Claim[];
  allClaims: Claim[];
  claimFilter: string;
  onClaimChange: (claim: Claim | null) => void;
  onFilterChange: (filter: string) => void | Promise<void>;
}) {
  async function selectClaim(id: string) {
    const payload = await apiCall<{ claim: Claim }>(`/api/claims/${id}`);
    onClaimChange(payload.claim);
    onNotice(`已选单据 ${payload.claim.status}`);
  }

  async function createClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Math.round(Number(form.get("amount")) * 100);
    const payload = await apiCall<{ claim: Claim }>("/api/claims", {
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
      items: [
        {
          memo: String(form.get("itemMemo") || form.get("purpose")),
          cents: amount,
          invoiceNo: String(form.get("invoiceNo") || ""),
        },
      ],
    });
    const itemId = payload.claim.items?.[0]?.id;
    let next = payload.claim;
    if (itemId) {
      await apiCall(`/api/claims/${next.id}/items/${itemId}/attachments`, {
        fileName: String(form.get("attachmentName") || "发票.txt"),
        contentType: "text/plain",
        fileBase64: btoa(unescape(encodeURIComponent(String(form.get("attachmentText") || "invoice-demo")))),
      });
      next = (await apiCall<{ claim: Claim }>(`/api/claims/${next.id}`)).claim;
    }
    onClaimChange(next);
    onNotice(`草稿已建并附票据：${next.id}`);
    await onLedgerChanged?.();
  }

  async function runAction(action: string, remark?: string) {
    if (!claim) return;
    const payload = await apiCall<{ claim: Claim }>(`/api/claims/${claim.id}/actions`, {
      action,
      expectedRevision: claim.revision,
      mutationId: `${action}-${claim.revision}-${Date.now()}`,
      remark,
    });
    onClaimChange(payload.claim);
    onNotice(`单据 ${payload.claim.status} · ${yuan(payload.claim.totalCents)} 元`);
    await onLedgerChanged?.();
  }

  return (
    <>
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
                  onClick={() => void selectClaim(row.id)}
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
            onChange={(event) => void onFilterChange(event.target.value)}
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
                  onClick={() => void selectClaim(row.id)}
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
            <Button className="mt-3" disabled={!bookId || !hasRole(roles, "employee")}>
              保存草稿并上传附件
            </Button>
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
            <Button
              disabled={!claim || !hasRole(roles, "employee") || (claim.status !== "draft" && claim.status !== "rejected")}
              onClick={() => void runAction("submit")}
            >
              提交财务
            </Button>
            <Button
              disabled={!claim || !hasRole(roles, "finance") || claim.status !== "financeReview"}
              onClick={() => void runAction("financeApprove", "票据齐全")}
            >
              财务通过
            </Button>
            <Button
              disabled={!claim || !hasRole(roles, "gm") || claim.status !== "gmReview"}
              onClick={() => void runAction("gmApprove", "同意")}
            >
              总经理通过并入账
            </Button>
            <Button
              disabled={
                !claim ||
                !hasRole(roles, "finance", "gm") ||
                (claim.status !== "financeReview" && claim.status !== "gmReview")
              }
              onClick={() => void runAction("reject", "资料不全")}
            >
              驳回
            </Button>
            <Button
              disabled={!claim || !hasRole(roles, "gm") || claim.status !== "paymentVoucher" || (claim.paidCents || 0) > 0}
              onClick={() => void runAction("void", "作废")}
            >
              作废并红冲
            </Button>
          </div>
          {claim?.items?.[0]?.attachments?.length ? (
            <p className="mt-3 text-sm">
              明细附件：
              {claim.items[0].attachments.map((a) => (
                <a key={a.id} className="ml-2 text-sky-700 underline" href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer">
                  {a.fileName}
                </a>
              ))}
            </p>
          ) : claim ? (
            <p className="mt-3 text-sm text-amber-700">还没有明细附件，提交会被拒绝</p>
          ) : null}
          {claim?.entryId ? <p className="mt-1 text-sm">应付分录：{claim.entryId}</p> : null}
          {claim?.paymentEntryId ? <p className="mt-1 text-sm">付款分录：{claim.paymentEntryId}</p> : null}
        </Card>
      </section>
    </>
  );
}

/** 出纳匹配付款；依赖当前选中的 claim。 */
export function ClaimPaymentPanel({
  bookId,
  roles,
  claim,
  statements,
  onNotice,
  onClaimChange,
  onLedgerChanged,
}: PanelProps & {
  claim: Claim | null;
  statements: import("./types").Statement[];
  onClaimChange: (claim: Claim) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function importStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiCall(`/api/books/${bookId}/statements`, {
      paidOn: form.get("paidOn"),
      cents: Math.round(Number(form.get("amount")) * 100),
      bankAccountCode: form.get("bankAccountCode") || "1002",
      reference: form.get("reference"),
      counterparty: form.get("counterparty") || "",
      remark: form.get("remark") || "",
    });
    onNotice("银行流水已导入。");
    await onLedgerChanged?.();
  }

  async function allocate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!claim) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const payload = await apiCall<{ claim: Claim }>(`/api/claims/${claim.id}/allocations`, {
        statementId: form.get("statementId"),
        cents: Math.round(Number(form.get("amount")) * 100),
        expectedRevision: claim.revision,
        mutationId: `alloc-${claim.revision}-${Date.now()}`,
        remark: form.get("remark") || "匹配付款",
        voucherNo: form.get("voucherNo") || "",
        fileName: String(form.get("fileName") || "receipt.txt"),
        fileBase64: btoa(unescape(encodeURIComponent(String(form.get("fileText") || "payment-proof")))),
      });
      onClaimChange(payload.claim);
      onNotice(`已核销 ${yuan(payload.claim.paidCents || 0)} / ${yuan(payload.claim.totalCents)} 元`);
      await onLedgerChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function reverse(allocationId: string) {
    if (!claim) return;
    const remark = window.prompt("撤销原因", "配错流水") || "";
    if (!remark.trim()) {
      onNotice("撤销必须填写原因");
      return;
    }
    const payload = await apiCall<{ claim: Claim }>(`/api/claims/${claim.id}/allocations/${allocationId}/reverse`, {
      expectedRevision: claim.revision,
      mutationId: `rev-${claim.revision}-${Date.now()}`,
      remark,
    });
    onClaimChange(payload.claim);
    onNotice(`已撤销匹配，当前已付 ${yuan(payload.claim.paidCents || 0)} / ${yuan(payload.claim.totalCents)} 元`);
    await onLedgerChanged?.();
  }

  async function voidStatement(id: string, reference: string) {
    const remark = window.prompt("作废原因", "导错流水") || "";
    if (!remark.trim()) {
      onNotice("作废必须填写原因");
      return;
    }
    await apiCall(`/api/books/${bookId}/statements/${id}/void`, { remark });
    onNotice(`已作废流水 ${reference}`);
    await onLedgerChanged?.();
  }

  return (
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
          <Button className="mt-3" disabled={!bookId || !hasRole(roles, "cashier", "finance")} type="submit">
            导入
          </Button>
        </form>
        <ul className="mt-3 space-y-1 text-sm text-stone-600">
          {statements.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2">
              <span>
                {row.reference} · 剩余 {yuan(row.remainingCents)} / {yuan(row.cents)} · {row.id.slice(0, 8)}
              </span>
              {row.remainingCents === row.cents && hasRole(roles, "cashier", "finance") ? (
                <Button type="button" onClick={() => void voidStatement(row.id, row.reference)}>
                  作废
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <form onSubmit={allocate}>
          <CardTitle>匹配付款（出纳）</CardTitle>
          <Input className="mt-3" name="statementId" placeholder="流水 id" required disabled={!claim} />
          <Input className="mt-2" name="amount" placeholder="本次核销（元）" defaultValue="60" required disabled={!claim} />
          <Input className="mt-2" name="voucherNo" placeholder="回单号（可空）" disabled={!claim} />
          <Input className="mt-2" name="remark" placeholder="说明" defaultValue="匹配付款" disabled={!claim} />
          <Input className="mt-2" name="fileName" placeholder="回单文件名" defaultValue="receipt.txt" disabled={!claim} />
          <Input className="mt-2" name="fileText" placeholder="回单文本（演示）" defaultValue="payment-proof" disabled={!claim} />
          <Button className="mt-3" disabled={!claim || busy || !hasRole(roles, "cashier") || claim.status !== "paymentVoucher"}>
            匹配并核销
          </Button>
        </form>
        {claim?.allocations?.length ? (
          <ul className="mt-3 space-y-1 text-sm text-stone-600">
            {claim.allocations.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {yuan(row.cents)} · {row.voucherNo || row.id.slice(0, 8)}
                  {row.reversedAt ? " · 已撤销" : ""}
                </span>
                {!row.reversedAt &&
                hasRole(roles, "cashier") &&
                (claim.status === "paymentVoucher" || claim.status === "completed") ? (
                  <Button type="button" onClick={() => void reverse(row.id)}>
                    撤销
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  );
}
