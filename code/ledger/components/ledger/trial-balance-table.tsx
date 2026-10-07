"use client";

import { yuan } from "./api";
import type { BalanceRow } from "./types";

export function TrialBalanceTable({ rows }: { rows: BalanceRow[] }) {
  return (
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
  );
}
