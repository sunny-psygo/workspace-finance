"use client";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { yuan } from "./api";
import type { BankRecon } from "./types";

export function BankReconPanel({
  bookId,
  recon,
  onRefresh,
}: {
  bookId: string;
  recon: BankRecon | null;
  onRefresh: () => void | Promise<void>;
}) {
  return (
    <section className="mt-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>银行调节（1002）</CardTitle>
          <Button type="button" disabled={!bookId} onClick={() => void onRefresh()}>
            刷新调节
          </Button>
        </div>
        {recon ? (
          <>
            <p className="mt-3 text-sm text-stone-700">
              账面 {yuan(recon.bookBalanceCents)} · 流水合计 {yuan(recon.statementTotalCents)} · 已匹配{" "}
              {yuan(recon.matchedCents)} · 未匹配 {yuan(recon.unmatchedCents)} · 待付应付 {yuan(recon.openPayableCents)}
            </p>
            <div className="mt-3 grid gap-4 text-sm text-stone-600 md:grid-cols-2">
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
  );
}
