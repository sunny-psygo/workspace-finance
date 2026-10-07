"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiCall, hasRole } from "./api";
import type { CloseChecklist, PanelProps } from "./types";

type Book = { id: string; name: string };

type BookCommon = PanelProps & {
  books: Book[];
  onBookCreated: (bookId: string) => void | Promise<void>;
  onSelectBook: (bookId: string) => void | Promise<void>;
  onRefreshBalance: () => void | Promise<void>;
};

/** 账套开立与科目维护。 */
export function BookSetupPanel({
  bookId,
  books,
  roles,
  onNotice,
  onBookCreated,
  onSelectBook,
  onRefreshBalance,
}: BookCommon) {
  const canFinance = hasRole(roles, "finance", "gm");

  async function openBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await apiCall<{ book: { id: string } }>("/api/books", { name: form.get("name") });
    onNotice(`账套已建立：${payload.book.id}`);
    await onBookCreated(payload.book.id);
  }

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiCall(`/api/books/${bookId}/accounts`, {
      code: form.get("code"),
      name: form.get("name"),
      kind: form.get("kind"),
    });
    onNotice("账户已建立。");
    await onRefreshBalance();
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Card>
        <form onSubmit={openBook}>
          <CardTitle>开账</CardTitle>
          <Input className="mt-3" name="name" placeholder="创意考拉 2026" required />
          <Button className="mt-3" type="submit" disabled={!canFinance}>
            建立账套
          </Button>
        </form>
        <ul className="mt-4 max-h-40 space-y-1 overflow-auto text-sm">
          {books.map((book) => (
            <li key={book.id}>
              <button type="button" className="text-left text-sky-700 underline" onClick={() => void onSelectBook(book.id)}>
                {book.name} · {book.id.slice(0, 8)}
                {book.id === bookId ? " · 当前" : ""}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <form onSubmit={addAccount}>
          <CardTitle>科目设置</CardTitle>
          <Input className="mt-3" name="code" placeholder="5602 / 2241 / 1002" required disabled={!bookId} />
          <Input className="mt-2" name="name" placeholder="科目名称" required disabled={!bookId} />
          <select className="mt-2 h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm" name="kind" disabled={!bookId}>
            <option value="expense">费用</option>
            <option value="liability">负债</option>
            <option value="asset">资产</option>
            <option value="equity">权益</option>
            <option value="income">收入</option>
          </select>
          <Button className="mt-3" disabled={!bookId || !canFinance}>
            建立账户
          </Button>
        </form>
        <p className="mt-3 text-sm text-stone-500">种子科目含 1002/1601/1602/2211/2221/2241/4103/4104/5602。</p>
      </Card>
    </section>
  );
}

/** 期末检查、月结、年结。 */
export function PeriodClosePanel({
  bookId,
  roles,
  onNotice,
  onRefreshBalance,
}: PanelProps & { onRefreshBalance: () => void | Promise<void> }) {
  const [checklist, setChecklist] = useState<CloseChecklist | null>(null);
  const canFinance = hasRole(roles, "finance", "gm");

  async function loadChecklist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const yearMonth = String(form.get("yearMonth") || "");
    const payload = await apiCall<{ checklist: CloseChecklist }>(
      `/api/books/${bookId}/periods/${encodeURIComponent(yearMonth)}/close-checklist`,
    );
    setChecklist(payload.checklist);
    onNotice(
      payload.checklist.closed
        ? `${yearMonth} 已结账`
        : payload.checklist.ready
          ? `${yearMonth} 可结账`
          : `${yearMonth} 有 ${payload.checklist.gaps.length} 类缺口`,
    );
  }

  async function closeMonth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiCall(`/api/books/${bookId}/periods/close`, {
      yearMonth: form.get("yearMonth"),
      remark: form.get("remark") || "结账",
    });
    onNotice(`已锁定期间 ${form.get("yearMonth")}（已结转损益）`);
    setChecklist(null);
    await onRefreshBalance();
  }

  async function reopenMonth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiCall(`/api/books/${bookId}/periods/reopen`, {
      yearMonth: form.get("yearMonth"),
      remark: form.get("remark") || "反结账",
    });
    onNotice(`已反结账 ${form.get("yearMonth")}（已红冲损益结转）`);
    setChecklist(null);
    await onRefreshBalance();
  }

  async function closeYearEnd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiCall(`/api/books/${bookId}/year-end/close`, {
      year: Number(form.get("year")),
      remark: form.get("remark") || "年末结转",
    });
    onNotice(`已年末结转 ${form.get("year")}`);
    await onRefreshBalance();
  }

  async function reopenYearEnd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiCall(`/api/books/${bookId}/year-end/reopen`, {
      year: Number(form.get("year")),
      remark: form.get("remark") || "撤销年结",
    });
    onNotice(`已撤销年末结转 ${form.get("year")}`);
    await onRefreshBalance();
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardTitle>结账前检查</CardTitle>
        <form className="mt-3" onSubmit={loadChecklist}>
          <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-02" required disabled={!bookId} />
          <Button className="mt-2" disabled={!bookId}>
            查询缺口清单
          </Button>
        </form>
        {checklist ? (
          <div className="mt-3 rounded border border-[var(--line)] p-2 text-sm">
            <p className={checklist.ready ? "text-emerald-700" : checklist.closed ? "text-stone-600" : "text-amber-700"}>
              {checklist.yearMonth} · {checklist.closed ? "已结账" : checklist.ready ? "可结账" : "有缺口"}
            </p>
            <ul className="mt-1 space-y-1">
              {checklist.gaps.length === 0 ? <li className="text-stone-500">无缺口</li> : null}
              {checklist.gaps.map((gap) => (
                <li key={gap.code}>
                  <span className="font-medium">{gap.code}</span>（{gap.count}）· {gap.next}
                  <div className="text-xs text-stone-500">{gap.samples.slice(0, 5).join("；")}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-500">先查清单，再锁定期间。</p>
        )}
      </Card>
      <Card>
        <CardTitle>月结 / 年结</CardTitle>
        <form className="mt-3" onSubmit={closeMonth}>
          <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-09" required disabled={!bookId} />
          <Input className="mt-2" name="remark" placeholder="结账说明" defaultValue="月结" disabled={!bookId} />
          <Button className="mt-2" disabled={!bookId || !canFinance}>
            锁定期间
          </Button>
        </form>
        <form className="mt-3" onSubmit={reopenMonth}>
          <Input name="yearMonth" placeholder="YYYY-MM" defaultValue="2026-09" required disabled={!bookId} />
          <Input className="mt-2" name="remark" placeholder="反结账原因" defaultValue="补凭证" required disabled={!bookId} />
          <Button className="mt-2" disabled={!bookId || !canFinance}>
            反结账
          </Button>
        </form>
        <form className="mt-4 border-t border-[var(--line)] pt-3" onSubmit={closeYearEnd}>
          <Input name="year" placeholder="年份" defaultValue="2026" required disabled={!bookId} />
          <Input className="mt-2" name="remark" placeholder="年末结转说明" defaultValue="年结" disabled={!bookId} />
          <Button className="mt-2" disabled={!bookId || !canFinance}>
            年末结转
          </Button>
        </form>
        <form className="mt-3" onSubmit={reopenYearEnd}>
          <Input name="year" placeholder="年份" defaultValue="2026" required disabled={!bookId} />
          <Input className="mt-2" name="remark" placeholder="撤销年结原因" defaultValue="改年结" required disabled={!bookId} />
          <Button className="mt-2" disabled={!bookId || !canFinance}>
            撤销年结
          </Button>
        </form>
      </Card>
    </section>
  );
}
