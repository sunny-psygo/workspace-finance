"use client";

import { FormEvent, useState } from "react";
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

type Claim = {
  id: string;
  status: string;
  revision: number;
  purpose: string;
  totalCents: number;
  entryId?: string | null;
};

function yuan(cents: number) {
  return (cents / 100).toFixed(2);
}

async function call<T>(url: string, body?: unknown, method = body ? "POST" : "GET"): Promise<T> {
  const response = await fetch(url, body ? {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  } : undefined);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`${payload.message} ${payload.next ?? ""}`);
  return payload;
}

export default function Page() {
  const [bookId, setBookId] = useState("");
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [notice, setNotice] = useState("先开账建科目，再走报销审批；总经理通过后自动过账。");

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

  async function postEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await call(`/api/books/${bookId}/entries`, {
      occurredOn: form.get("occurredOn"),
      memo: form.get("memo"),
      reference: form.get("reference") || undefined,
      postings: [
        { accountCode: form.get("debit"), side: "debit", cents: Math.round(Number(form.get("amount")) * 100) },
        { accountCode: form.get("credit"), side: "credit", cents: Math.round(Number(form.get("amount")) * 100) },
      ],
    });
    setNotice("分录已过账。同一 reference 再提交会返回原分录。");
    await refreshBalance();
  }

  async function createClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Math.round(Number(form.get("amount")) * 100);
    const payload = await call<{ claim: Claim }>("/api/claims", {
      bookId,
      applicant: form.get("applicant"),
      department: form.get("department"),
      costCenter: form.get("costCenter"),
      payeeName: form.get("payeeName"),
      payeeAccount: form.get("payeeAccount"),
      bankName: form.get("bankName"),
      purpose: form.get("purpose"),
      occurredOn: form.get("occurredOn"),
      expenseAccountCode: form.get("expenseAccountCode") || "5602",
      payableAccountCode: form.get("payableAccountCode") || "2241",
      actor: form.get("applicant"),
      items: [{ memo: String(form.get("itemMemo") || form.get("purpose")), cents: amount }],
    });
    setClaim(payload.claim);
    setNotice(`草稿已建：${payload.claim.id}`);
  }

  async function runAction(action: string, role: string, actor: string, remark?: string) {
    if (!claim) return;
    const payload = await call<{ claim: Claim }>(`/api/claims/${claim.id}/actions`, {
      action,
      role,
      actor,
      expectedRevision: claim.revision,
      mutationId: `${action}-${claim.revision}-${Date.now()}`,
      remark,
    });
    setClaim(payload.claim);
    setNotice(`单据 ${payload.claim.status}，金额 ${yuan(payload.claim.totalCents)}`);
    await refreshBalance();
  }

  async function refreshBalance() {
    if (!bookId) return;
    const payload = await call<{ rows: BalanceRow[] }>(`/api/books/${bookId}/trial-balance`);
    setRows(payload.rows);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm text-stone-500">积木：账户、分录、过账；报销只是往账本送分录</p>
        <h1 className="mt-1 text-3xl font-semibold">账本</h1>
        <p className="mt-2 text-stone-600">{notice}</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <form onSubmit={openBook}>
            <CardTitle>开账</CardTitle>
            <Input className="mt-3" name="name" placeholder="创意考拉 2026" required />
            <Button className="mt-3" type="submit">建立账套</Button>
          </form>
        </Card>
        <Card>
          <form onSubmit={addAccount}>
            <CardTitle>账户</CardTitle>
            <Input className="mt-3" name="code" placeholder="5602" required disabled={!bookId} />
            <Input className="mt-2" name="name" placeholder="管理费用" required disabled={!bookId} />
            <select className="mt-2 h-10 w-full rounded-md border border-stone-300 px-3 text-sm" name="kind" disabled={!bookId}>
              <option value="expense">费用</option>
              <option value="liability">负债</option>
              <option value="asset">资产</option>
              <option value="equity">权益</option>
              <option value="income">收入</option>
            </select>
            <Button className="mt-3" disabled={!bookId}>建立账户</Button>
          </form>
        </Card>
        <Card>
          <form onSubmit={postEntry}>
            <CardTitle>手工过账</CardTitle>
            <Input className="mt-3" name="occurredOn" type="date" required disabled={!bookId} />
            <Input className="mt-2" name="memo" placeholder="摘要" required disabled={!bookId} />
            <Input className="mt-2" name="debit" placeholder="借方科目代码" required disabled={!bookId} />
            <Input className="mt-2" name="credit" placeholder="贷方科目代码" required disabled={!bookId} />
            <Input className="mt-2" name="amount" placeholder="金额（元）" required disabled={!bookId} />
            <Input className="mt-2" name="reference" placeholder="幂等键，可空" disabled={!bookId} />
            <Button className="mt-3" disabled={!bookId}>过账</Button>
          </form>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <form onSubmit={createClaim}>
            <CardTitle>报销草稿</CardTitle>
            <Input className="mt-3" name="applicant" placeholder="申请人" defaultValue="张三" required disabled={!bookId} />
            <Input className="mt-2" name="department" placeholder="部门" defaultValue="行政" required disabled={!bookId} />
            <Input className="mt-2" name="costCenter" placeholder="费用归属" defaultValue="公司公共" required disabled={!bookId} />
            <Input className="mt-2" name="payeeName" placeholder="收款人" defaultValue="张三" required disabled={!bookId} />
            <Input className="mt-2" name="payeeAccount" placeholder="收款账号" defaultValue="6222000000000001" required disabled={!bookId} />
            <Input className="mt-2" name="bankName" placeholder="开户行" defaultValue="测试银行" required disabled={!bookId} />
            <Input className="mt-2" name="purpose" placeholder="事由" defaultValue="办公用品" required disabled={!bookId} />
            <Input className="mt-2" name="itemMemo" placeholder="明细说明" defaultValue="打印纸" required disabled={!bookId} />
            <Input className="mt-2" name="occurredOn" type="date" required disabled={!bookId} />
            <Input className="mt-2" name="amount" placeholder="金额（元）" defaultValue="128" required disabled={!bookId} />
            <Input className="mt-2" name="expenseAccountCode" placeholder="费用科目 5602" defaultValue="5602" disabled={!bookId} />
            <Input className="mt-2" name="payableAccountCode" placeholder="应付科目 2241" defaultValue="2241" disabled={!bookId} />
            <Button className="mt-3" disabled={!bookId}>保存草稿</Button>
          </form>
        </Card>
        <Card>
          <CardTitle>审批</CardTitle>
          <p className="mt-3 text-sm text-stone-600">
            {claim
              ? `当前 ${claim.status} · revision ${claim.revision} · ${yuan(claim.totalCents)} 元`
              : "先保存草稿"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={!claim || claim.status !== "draft" && claim.status !== "rejected"} onClick={() => runAction("submit", "employee", "张三")}>提交财务</Button>
            <Button disabled={!claim || claim.status !== "financeReview"} onClick={() => runAction("financeApprove", "finance", "财务李", "票据齐全")}>财务通过</Button>
            <Button disabled={!claim || claim.status !== "gmReview"} onClick={() => runAction("gmApprove", "gm", "总经理王", "同意")}>总经理通过并入账</Button>
            <Button disabled={!claim || (claim.status !== "financeReview" && claim.status !== "gmReview")} onClick={() => runAction("reject", "finance", "财务李", "资料不全")}>驳回</Button>
          </div>
          {claim?.entryId ? <p className="mt-3 text-sm">已入账分录：{claim.entryId}</p> : null}
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
    </main>
  );
}
