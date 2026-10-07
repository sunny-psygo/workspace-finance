"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiCall, yuan } from "./api";
import type { ArchiveCase, PanelProps } from "./types";

export function ArchivePanel({ bookId, onNotice }: PanelProps) {
  const [cases, setCases] = useState<ArchiveCase[]>([]);

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    const period = String(form.get("period") || "");
    const keyword = String(form.get("keyword") || "");
    if (period) query.set("period", period);
    if (keyword) query.set("keyword", keyword);
    const payload = await apiCall<{ cases: ArchiveCase[] }>(`/api/books/${bookId}/archive?${query}`);
    setCases(payload.cases);
    onNotice(`档案主卷 ${payload.cases.length} 条`);
  }

  return (
    <section className="mt-6">
      <Card>
        <CardTitle>电子档案主卷</CardTitle>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={load}>
          <Input className="w-40" name="period" placeholder="期间 YYYY-MM" defaultValue="2026-02" disabled={!bookId} />
          <Input className="w-56" name="keyword" placeholder="关键词（凭证/摘要/来源）" disabled={!bookId} />
          <Button disabled={!bookId}>查询主卷</Button>
        </form>
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
          {cases.length === 0 ? <li className="text-stone-500">按期间查询已过账凭证主卷。</li> : null}
          {cases.map((row) => (
            <li key={row.entryId} className="rounded border border-stone-200 p-2">
              <div className="font-medium">
                {row.displayNumber} · {row.occurredOn} · {yuan(row.debitCents)}
              </div>
              <div className="text-stone-600">{row.memo}</div>
              <div className="text-xs text-stone-500">
                引用 {row.references.length} · 附件 {row.attachments.length} · hash {row.contentHash.slice(0, 12)}…
              </div>
              {row.references.length ? (
                <div className="mt-1 text-xs text-stone-600">
                  {row.references
                    .slice(0, 6)
                    .map((ref) => `${ref.type}:${ref.label}`)
                    .join("；")}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
