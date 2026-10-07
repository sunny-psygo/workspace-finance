"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiCall, yuan } from "./api";
import type { PanelProps } from "./types";

type JournalEntry = {
  id: string;
  occurredOn: string;
  memo: string;
  reference: string | null;
  postings: Array<{
    side: string;
    cents: number;
    account: { code: string; name: string };
  }>;
};

export function JournalPanel({ bookId, onNotice }: PanelProps) {
  const [period, setPeriod] = useState("2026-02");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load(nextPeriod = period) {
    if (!bookId) return;
    const query = nextPeriod ? `?period=${encodeURIComponent(nextPeriod)}` : "";
    const payload = await apiCall<{ entries: JournalEntry[] }>(`/api/books/${bookId}/entries${query}`);
    setEntries(payload.entries);
    setSelectedId(payload.entries[0]?.id ?? null);
    onNotice(`凭证 ${payload.entries.length} 条${nextPeriod ? `（${nextPeriod}）` : ""}`);
  }

  useEffect(() => {
    void load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = String(form.get("period") || "");
    setPeriod(next);
    await load(next);
  }

  const selected = entries.find((row) => row.id === selectedId) ?? null;

  return (
    <section className="grid gap-4 md:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.2fr)]">
      <Card>
        <CardTitle>序时账</CardTitle>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onSubmit}>
          <Input className="w-36" name="period" placeholder="YYYY-MM" defaultValue={period} disabled={!bookId} />
          <Button disabled={!bookId}>查询</Button>
        </form>
        <ul className="mt-3 max-h-[28rem] space-y-1 overflow-auto text-sm">
          {entries.length === 0 ? <li className="text-stone-500">该期间暂无凭证。</li> : null}
          {entries.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={`w-full rounded px-2 py-2 text-left hover:bg-[var(--surface-soft)] ${
                  selectedId === row.id ? "bg-[var(--surface-soft)] font-semibold" : ""
                }`}
                onClick={() => setSelectedId(row.id)}
              >
                <div>
                  {row.occurredOn} · {row.reference || row.id.slice(0, 8)}
                </div>
                <div className="text-stone-500">{row.memo}</div>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardTitle>凭证详情</CardTitle>
        {selected ? (
          <div className="mt-3 space-y-3 text-sm">
            <p>
              {selected.occurredOn} · {selected.reference || "无业务参考号"}
            </p>
            <p className="text-stone-600">{selected.memo}</p>
            <table className="w-full text-left">
              <thead className="bg-[var(--surface-soft)]">
                <tr>
                  <th className="px-2 py-2">科目</th>
                  <th className="px-2 py-2">借方</th>
                  <th className="px-2 py-2">贷方</th>
                </tr>
              </thead>
              <tbody>
                {selected.postings.map((line, index) => (
                  <tr key={`${selected.id}-${index}`} className="border-t border-[var(--line)]">
                    <td className="px-2 py-2">
                      {line.account.code} {line.account.name}
                    </td>
                    <td className="px-2 py-2">{line.side === "debit" ? yuan(line.cents) : ""}</td>
                    <td className="px-2 py-2">{line.side === "credit" ? yuan(line.cents) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-500">左侧选择一张凭证。</p>
        )}
      </Card>
    </section>
  );
}
