"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiCall, yuan } from "./api";
import type { BalanceSheet, IncomeStatement, PanelProps } from "./types";

export function ReportsPanel({ bookId, onNotice }: PanelProps) {
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [income, setIncome] = useState<IncomeStatement | null>(null);

  async function loadBalanceSheet() {
    const payload = await apiCall<{ report: BalanceSheet }>(`/api/books/${bookId}/reports/balance-sheet`);
    setBalanceSheet(payload.report);
    onNotice(
      payload.report.balanced
        ? "资产负债表已刷新（勾稽平衡）"
        : `资产负债表不平衡：资产 ${yuan(payload.report.assetTotalCents)} ≠ 负债权益 ${yuan(payload.report.liabilityAndEquityTotalCents)}`,
    );
  }

  async function loadIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const yearMonth = String(form.get("yearMonth") || "");
    const payload = await apiCall<{ report: IncomeStatement }>(
      `/api/books/${bookId}/reports/income-statement?yearMonth=${encodeURIComponent(yearMonth)}`,
    );
    setIncome(payload.report);
    onNotice(`${yearMonth} 利润总额 ${yuan(payload.report.profitCents)}`);
  }

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2">
      <Card>
        <CardTitle>资产负债表</CardTitle>
        <Button className="mt-3" disabled={!bookId} onClick={() => void loadBalanceSheet()}>
          刷新资产负债表
        </Button>
        {balanceSheet ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className={balanceSheet.balanced ? "text-emerald-700" : "text-red-700"}>
              {balanceSheet.balanced ? "勾稽平衡" : "勾稽不平衡"} · {balanceSheet.asOf}
            </p>
            <ReportGroup title="资产" lines={balanceSheet.assets} totalLabel="资产合计" total={balanceSheet.assetTotalCents} />
            <ReportGroup
              title="负债"
              lines={balanceSheet.liabilities}
              totalLabel="负债合计"
              total={balanceSheet.liabilityTotalCents}
            />
            <ReportGroup
              title="所有者权益"
              lines={balanceSheet.equity}
              totalLabel="负债和权益合计"
              total={balanceSheet.liabilityAndEquityTotalCents}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-500">点刷新从试算派生。</p>
        )}
      </Card>
      <Card>
        <CardTitle>利润表</CardTitle>
        <form className="mt-3 space-y-2" onSubmit={loadIncome}>
          <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-02" required disabled={!bookId} />
          <Button disabled={!bookId}>刷新利润表</Button>
        </form>
        {income ? (
          <ul className="mt-3 space-y-1 text-sm">
            {income.lines.map((row) => (
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
  );
}

function ReportGroup({
  title,
  lines,
  totalLabel,
  total,
}: {
  title: string;
  lines: Array<{ key: string; label: string; cents: number }>;
  totalLabel: string;
  total: number;
}) {
  return (
    <>
      <p className="font-medium">{title}</p>
      <ul>
        {lines.map((row) => (
          <li key={row.key} className="flex justify-between gap-2">
            <span>{row.label}</span>
            <span>{yuan(row.cents)}</span>
          </li>
        ))}
        <li className="flex justify-between border-t pt-1 font-medium">
          <span>{totalLabel}</span>
          <span>{yuan(total)}</span>
        </li>
      </ul>
    </>
  );
}
