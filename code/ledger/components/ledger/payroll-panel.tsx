"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiCall, hasRole, yuan } from "./api";
import type { PanelProps, PayrollBatch } from "./types";

export function PayrollPanel({ bookId, roles, onNotice, onLedgerChanged }: PanelProps) {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [payroll, setPayroll] = useState<PayrollBatch | null>(null);
  const canHr = hasRole(roles, "hr", "finance", "gm");
  const canFinance = hasRole(roles, "finance", "gm");
  const canPay = hasRole(roles, "cashier", "finance");

  async function refresh() {
    if (!bookId) return;
    const payload = await apiCall<{ batches: PayrollBatch[] }>(`/api/books/${bookId}/payroll/batches`);
    setBatches(payload.batches);
  }

  useEffect(() => {
    setPayroll(null);
    void refresh();
  }, [bookId]);

  async function createPayroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const period = String(form.get("period") || "2026-01");
    const created = await apiCall<{ batch: PayrollBatch }>(`/api/books/${bookId}/payroll/batches`, {
      period,
      mutationId: `pb-ui-${Date.now()}`,
    });
    const csv = String(form.get("csv") || "").trim();
    let withLines: { batch: PayrollBatch };
    if (csv) {
      withLines = await apiCall<{ batch: PayrollBatch }>(
        `/api/payroll/batches/${created.batch.id}/lines-csv`,
        {
          expectedRevision: created.batch.revision,
          mutationId: `pb-csv-ui-${Date.now()}`,
          csv,
        },
        "PUT",
      );
    } else {
      withLines = await apiCall<{ batch: PayrollBatch }>(
        `/api/payroll/batches/${created.batch.id}/lines`,
        {
          expectedRevision: created.batch.revision,
          mutationId: `pb-lines-ui-${Date.now()}`,
          lines: [
            {
              personCode: String(form.get("personCode") || "E001"),
              personName: String(form.get("personName") || "张三"),
              grossCents: Math.round(Number(form.get("grossYuan") || 0) * 100),
              employeeSiCents: Math.round(Number(form.get("siYuan") || 0) * 100),
              housingFundCents: Math.round(Number(form.get("hfYuan") || 0) * 100),
            },
          ],
        },
        "PUT",
      );
    }
    setPayroll(withLines.batch);
    onNotice(`工资批次已试算，个税 ${yuan(withLines.batch.taxCents)}，实发 ${yuan(withLines.batch.netCents)}`);
    await refresh();
  }

  async function confirmTax() {
    if (!payroll) return;
    const payload = await apiCall<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/confirm-tax`, {
      expectedRevision: payroll.revision,
      mutationId: `pb-tax-ui-${Date.now()}`,
    });
    setPayroll(payload.batch);
    onNotice("个税已确认");
    await refresh();
  }

  async function importBureau(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payroll?.lines?.length) return;
    const form = new FormData(event.currentTarget);
    const csv = String(form.get("bureauCsv") || "").trim();
    let payload: { batch: PayrollBatch };
    if (csv) {
      payload = await apiCall<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/bureau-tax-csv`, {
        expectedRevision: payroll.revision,
        mutationId: `pb-bureau-csv-${Date.now()}`,
        csv,
      });
    } else {
      const line = payroll.lines[0];
      const bureauCents = Math.round(Number(form.get("bureauYuan") || 0) * 100);
      const reason = String(form.get("reason") || "");
      payload = await apiCall<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/bureau-tax`, {
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
    onNotice(`已导入税局个税并确认，实发 ${yuan(payload.batch.netCents)}`);
    await refresh();
  }

  async function saveOpeningTax(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiCall(
      `/api/books/${bookId}/payroll/opening-tax`,
      {
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
      },
      "PUT",
    );
    onNotice("期初累计已保存，下次试算会自动带入");
  }

  async function postBatch() {
    if (!payroll) return;
    const payload = await apiCall<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/post`, {
      expectedRevision: payroll.revision,
      mutationId: `pb-post-ui-${Date.now()}`,
    });
    setPayroll(payload.batch);
    onNotice("工资已过账");
    await refresh();
    await onLedgerChanged?.();
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payroll) return;
    const form = new FormData(event.currentTarget);
    const payload = await apiCall<{ batch: PayrollBatch }>(`/api/payroll/batches/${payroll.id}/payments`, {
      statementId: form.get("statementId"),
      cents: Math.round(Number(form.get("yuan") || 0) * 100),
      expectedRevision: payroll.revision,
      mutationId: `pb-pay-ui-${Date.now()}`,
    });
    setPayroll(payload.batch);
    onNotice(`工资付款 ${payload.batch.status}`);
    await refresh();
    await onLedgerChanged?.();
  }

  return (
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
          <Button className="mt-3" disabled={!bookId || !canHr}>
            创建并试算
          </Button>
        </form>
        <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-sm">
          {batches.length === 0 ? <li className="text-stone-500">暂无工资批次</li> : null}
          {batches.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={`text-left underline ${payroll?.id === row.id ? "text-stone-900" : "text-sky-700"}`}
                onClick={async () => {
                  const payload = await apiCall<{ batch: PayrollBatch }>(`/api/payroll/batches/${row.id}`);
                  setPayroll(payload.batch);
                  onNotice(`已选工资 ${payload.batch.period} ${payload.batch.status}`);
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
              <Button disabled={!canFinance || payroll.status !== "calculated"} onClick={() => void confirmTax()}>
                按试算确认
              </Button>
              <Button disabled={!canFinance || payroll.status !== "taxVerified"} onClick={() => void postBatch()}>
                过账
              </Button>
            </div>
            <form className="mt-2 space-y-2" onSubmit={importBureau}>
              <p className="text-stone-500">
                试算个税 {yuan(payroll.lines?.[0]?.estimatedTaxCents ?? payroll.taxCents)}
                {payroll.lines?.[0]?.bureauTaxCents != null ? ` · 税局 ${yuan(payroll.lines[0].bureauTaxCents)}` : ""}
              </p>
              <Input
                name="bureauYuan"
                placeholder="税局个税（元，单人）"
                defaultValue={((payroll.lines?.[0]?.estimatedTaxCents ?? payroll.taxCents) / 100).toFixed(2)}
                disabled={payroll.status !== "calculated" && payroll.status !== "taxVerified"}
              />
              <Input
                name="reason"
                placeholder="与试算不同时的原因"
                disabled={payroll.status !== "calculated" && payroll.status !== "taxVerified"}
              />
              <textarea
                className="h-20 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                name="bureauCsv"
                placeholder={"多人可粘贴 CSV：\n人员编号,本期个税,差异原因\nE001,105,"}
                disabled={payroll.status !== "calculated" && payroll.status !== "taxVerified"}
              />
              <Button disabled={!canFinance || (payroll.status !== "calculated" && payroll.status !== "taxVerified")}>
                导入税局并确认
              </Button>
            </form>
            <form className="mt-2" onSubmit={pay}>
              <Input
                name="statementId"
                placeholder="银行流水 id"
                required
                disabled={payroll.status !== "posted" && payroll.status !== "paid"}
              />
              <Input
                className="mt-2"
                name="yuan"
                placeholder="付款金额（元）"
                defaultValue={(Math.max(0, payroll.netCents - payroll.paidCents) / 100).toFixed(2)}
                disabled={payroll.status !== "posted" && payroll.status !== "paid"}
              />
              <Button className="mt-2" disabled={!canPay || (payroll.status !== "posted" && payroll.status !== "paid")}>
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
          <Button className="mt-2" disabled={!bookId || !canFinance}>
            保存期初
          </Button>
        </form>
      </Card>
    </section>
  );
}
