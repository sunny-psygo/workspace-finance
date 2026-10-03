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
  totalCents: number;
  paidCents?: number;
  entryId?: string | null;
  paymentEntryId?: string | null;
  items?: Array<{
    id: string;
    memo: string;
    attachments?: Array<{ id: string; fileName: string }>;
  }>;
  allocations?: Array<{ id: string; cents: number; voucherNo: string }>;
};

type Statement = {
  id: string;
  reference: string;
  cents: number;
  remainingCents: number;
  bankAccountCode: string;
  paidOn: string;
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
  const [statements, setStatements] = useState<Statement[]>([]);
  const [notice, setNotice] = useState("先登录。演示账号见页面底部。");

  useEffect(() => {
    call<{ user: User }>("/api/auth/me")
      .then((payload) => setUser(payload.user))
      .catch(() => setUser(null));
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
  }

  async function refreshBalance() {
    if (!bookId) return;
    const payload = await call<{ rows: BalanceRow[] }>(`/api/books/${bookId}/trial-balance`);
    setRows(payload.rows);
  }

  async function refreshStatements() {
    if (!bookId) return;
    const payload = await call<{ statements: Statement[] }>(`/api/books/${bookId}/statements`);
    setStatements(payload.statements);
  }

  async function closeMonth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookId) return;
    const form = new FormData(event.currentTarget);
    await call(`/api/books/${bookId}/periods/close`, {
      yearMonth: form.get("yearMonth"),
      remark: form.get("remark") || "结账",
    });
    setNotice(`已锁定期间 ${form.get("yearMonth")}`);
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
            演示：zhangsan / finance / gm / cashier，密码均为 Passw0rd!
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
              <Button className="mt-3" disabled={!bookId} onClick={refreshBalance}>刷新试算</Button>
              <form className="mt-4" onSubmit={closeMonth}>
                <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-09" required disabled={!bookId} />
                <Input className="mt-2" name="remark" placeholder="结账说明" defaultValue="月结" disabled={!bookId} />
                <Button className="mt-2" disabled={!bookId || (!roles.includes("finance") && !roles.includes("gm"))}>锁定期间</Button>
              </form>
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
                <Input className="mt-2" name="invoiceNo" placeholder="发票号（可空）" defaultValue="INV-DEMO-001" disabled={!bookId} />
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
              </div>
              {claim?.items?.[0]?.attachments?.length
                ? <p className="mt-3 text-sm">明细附件：{claim.items[0].attachments.map((a) => a.fileName).join("、")}</p>
                : claim ? <p className="mt-3 text-sm text-amber-700">还没有明细附件，提交会被拒绝</p> : null}
              {claim?.entryId ? <p className="mt-1 text-sm">应付分录：{claim.entryId}</p> : null}
              {claim?.paymentEntryId ? <p className="mt-1 text-sm">付款分录：{claim.paymentEntryId}</p> : null}
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
                  <li key={row.id}>{row.reference} · 剩余 {yuan(row.remainingCents)} / {yuan(row.cents)} · {row.id.slice(0, 8)}</li>
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
