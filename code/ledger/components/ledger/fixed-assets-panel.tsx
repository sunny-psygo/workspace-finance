"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiCall, hasRole, yuan } from "./api";
import type { FixedAsset, PanelProps } from "./types";

export function FixedAssetsPanel({ bookId, roles, onNotice, onLedgerChanged }: PanelProps) {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const canFinance = hasRole(roles, "finance", "gm");

  async function refresh() {
    if (!bookId) return;
    const payload = await apiCall<{ assets: FixedAsset[] }>(`/api/books/${bookId}/fixed-assets`);
    setAssets(payload.assets);
  }

  useEffect(() => {
    void refresh();
  }, [bookId]);

  async function createCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await apiCall<{ asset: FixedAsset }>(`/api/books/${bookId}/fixed-assets`, {
      code: form.get("code"),
      name: form.get("name"),
      startOn: form.get("startOn"),
      costCents: Math.round(Number(form.get("costYuan") || 0) * 100),
      residualRatePercent: Number(form.get("residualRatePercent") || 5),
      usefulMonths: Number(form.get("usefulMonths") || 12),
      mutationId: `fa-create-ui-${Date.now()}`,
      remark: form.get("remark") || "",
    });
    onNotice(`资产已建卡：${payload.asset.code} ${payload.asset.name}`);
    await refresh();
    await onLedgerChanged?.();
  }

  async function depreciate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const yearMonth = String(form.get("yearMonth") || "");
    const payload = await apiCall<{ yearMonth: string; depreciated: FixedAsset[] }>(
      `/api/books/${bookId}/fixed-assets/depreciate`,
      { yearMonth, mutationId: `fa-dep-ui-${Date.now()}` },
    );
    onNotice(`${payload.yearMonth} 已计提 ${payload.depreciated.length} 项资产`);
    await refresh();
    await onLedgerChanged?.();
  }

  async function dispose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assetId = String(form.get("assetId") || "");
    const payload = await apiCall<{ asset: FixedAsset }>(`/api/fixed-assets/${assetId}/dispose`, {
      occurredOn: form.get("occurredOn"),
      mutationId: `fa-dispose-ui-${Date.now()}`,
      remark: form.get("remark") || "处置",
    });
    onNotice(`资产已处置：${payload.asset.code}`);
    await refresh();
    await onLedgerChanged?.();
  }

  const active = assets.filter((row) => row.status === "active");

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2">
      <Card>
        <CardTitle>固定资产</CardTitle>
        <form className="mt-3 space-y-2" onSubmit={createCard}>
          <Input name="code" placeholder="资产编号" defaultValue="FA-001" required disabled={!bookId} />
          <Input name="name" placeholder="资产名称" defaultValue="办公电脑" required disabled={!bookId} />
          <Input name="startOn" placeholder="启用日 YYYY-MM-DD" defaultValue="2026-01-10" required disabled={!bookId} />
          <Input name="costYuan" placeholder="原值（元）" defaultValue="1200" required disabled={!bookId} />
          <Input name="residualRatePercent" placeholder="残值率 %" defaultValue="5" disabled={!bookId} />
          <Input name="usefulMonths" placeholder="使用月数" defaultValue="12" disabled={!bookId} />
          <Input name="remark" placeholder="备注" defaultValue="购置" disabled={!bookId} />
          <Button disabled={!bookId || !canFinance}>建卡入账</Button>
        </form>
        <form className="mt-4 space-y-2 border-t border-stone-200 pt-3" onSubmit={depreciate}>
          <p className="text-sm font-medium">月折旧（次月起提）</p>
          <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-02" required disabled={!bookId} />
          <Button disabled={!bookId || !canFinance}>计提本月应提</Button>
        </form>
        <ul className="mt-4 max-h-48 space-y-1 overflow-auto text-sm">
          {assets.length === 0 ? <li className="text-stone-500">暂无资产卡片</li> : null}
          {assets.map((row) => (
            <li key={row.id}>
              {row.code} · {row.name} · {row.status} · 原值 {yuan(row.costCents)} · 累计折旧 {yuan(row.accumDepCents)} · 已提{" "}
              {row.depreciations?.length ?? 0}/{row.usefulMonths} 期
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardTitle>资产处置</CardTitle>
        <form className="mt-3 space-y-2" onSubmit={dispose}>
          <select
            className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm"
            name="assetId"
            disabled={!bookId || active.length === 0}
            defaultValue=""
          >
            <option value="" disabled>
              选择在用资产
            </option>
            {active.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code} · {row.name}
              </option>
            ))}
          </select>
          <Input name="occurredOn" placeholder="处置日 YYYY-MM-DD" defaultValue="2026-03-20" required disabled={!bookId} />
          <Input name="remark" placeholder="处置说明" defaultValue="报废" required disabled={!bookId} />
          <Button disabled={!bookId || !canFinance}>处置（当月先提后处置）</Button>
        </form>
        <p className="mt-3 text-sm text-stone-500">购置借 1601 / 贷 2241；折旧借 5602 / 贷 1602；应提未提会阻断该月结账。</p>
      </Card>
    </section>
  );
}
