"use client";

import { useCallback, useEffect, useState } from "react";
import { ArchivePanel } from "@/components/ledger/archive-panel";
import { apiCall } from "@/components/ledger/api";
import { BankReconPanel } from "@/components/ledger/bank-recon-panel";
import { BookPanel } from "@/components/ledger/book-panel";
import { ClaimPaymentPanel, ClaimsPanel } from "@/components/ledger/claims-panel";
import { FixedAssetsPanel } from "@/components/ledger/fixed-assets-panel";
import { LoginCard } from "@/components/ledger/login-card";
import { PayrollPanel } from "@/components/ledger/payroll-panel";
import { ReportsPanel } from "@/components/ledger/reports-panel";
import { SessionHeader } from "@/components/ledger/session-header";
import { TrialBalanceTable } from "@/components/ledger/trial-balance-table";
import type {
  BalanceRow,
  BankRecon,
  Claim,
  Statement,
  User,
} from "@/components/ledger/types";
import { UsersPanel } from "@/components/ledger/users-panel";

/**
 * 页面只做编排：会话 + 账套上下文 + 积木面板。
 * 各业务状态下沉到对应面板，避免单文件平面聚合。
 */
export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [bookId, setBookId] = useState("");
  const [books, setBooks] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [claimFilter, setClaimFilter] = useState("all");
  const [statements, setStatements] = useState<Statement[]>([]);
  const [recon, setRecon] = useState<BankRecon | null>(null);
  const [notice, setNotice] = useState("先登录。演示账号见页面底部。");

  const roles = user?.roles ?? [];

  const refreshBooks = useCallback(async () => {
    const payload = await apiCall<{ books: Array<{ id: string; name: string }> }>("/api/books");
    setBooks(payload.books);
    return payload.books;
  }, []);

  const refreshBalance = useCallback(async (id = bookId) => {
    if (!id) return;
    const payload = await apiCall<{ rows: BalanceRow[] }>(`/api/books/${id}/trial-balance`);
    setRows(payload.rows);
  }, [bookId]);

  const refreshClaims = useCallback(async (id = bookId, status = claimFilter) => {
    if (!id) return;
    const queuePayload = await apiCall<{ claims: Claim[] }>(
      `/api/claims?bookId=${encodeURIComponent(id)}&queue=1`,
    );
    setClaims(queuePayload.claims);
    const statusQuery = status && status !== "all" ? `&status=${encodeURIComponent(status)}` : "";
    const allPayload = await apiCall<{ claims: Claim[] }>(
      `/api/claims?bookId=${encodeURIComponent(id)}${statusQuery}`,
    );
    setAllClaims(allPayload.claims);
  }, [bookId, claimFilter]);

  const refreshStatements = useCallback(async (id = bookId) => {
    if (!id) return;
    const payload = await apiCall<{ statements: Statement[] }>(`/api/books/${id}/statements`);
    setStatements(payload.statements);
  }, [bookId]);

  const refreshRecon = useCallback(async (id = bookId) => {
    if (!id) return;
    const payload = await apiCall<{ summary: BankRecon }>(
      `/api/books/${id}/bank-reconciliation?bankAccountCode=1002`,
    );
    setRecon(payload.summary);
  }, [bookId]);

  const selectBook = useCallback(async (id: string) => {
    setBookId(id);
    setClaim(null);
    setNotice(`当前账套：${id}`);
    await Promise.all([
      refreshBalance(id),
      refreshClaims(id),
      refreshStatements(id),
      refreshRecon(id),
    ]);
  }, [refreshBalance, refreshClaims, refreshRecon, refreshStatements]);

  const refreshLedgerSurfaces = useCallback(async () => {
    await Promise.all([
      refreshBalance(),
      refreshClaims(),
      refreshStatements(),
      refreshRecon(),
    ]);
  }, [refreshBalance, refreshClaims, refreshRecon, refreshStatements]);

  useEffect(() => {
    apiCall<{ user: User }>("/api/auth/me")
      .then(async (payload) => {
        setUser(payload.user);
        const list = await refreshBooks();
        if (list[0]) await selectBook(list[0].id);
      })
      .catch(() => setUser(null));
    // 仅首屏恢复会话
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(next: User) {
    setUser(next);
    setNotice(`已登录：${next.displayName}（${next.roles.join(",")}）`);
    const list = await refreshBooks();
    if (list[0]) await selectBook(list[0].id);
  }

  async function handleLogout() {
    await apiCall("/api/auth/logout", {});
    setUser(null);
    setNotice("已退出。");
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <SessionHeader
        user={user}
        notice={notice}
        onLogout={handleLogout}
        onPasswordChanged={async () => {
          setUser(null);
          setNotice("密码已更新，请重新登录。");
        }}
      />

      {!user ? (
        <LoginCard onLogin={handleLogin} />
      ) : (
        <>
          <BookPanel
            bookId={bookId}
            books={books}
            roles={roles}
            onNotice={setNotice}
            onBookCreated={async (id) => {
              await refreshBooks();
              await selectBook(id);
            }}
            onSelectBook={selectBook}
            onRefreshBalance={() => refreshBalance()}
            onRefreshClaims={() => refreshClaims()}
          />

          <ClaimsPanel
            bookId={bookId}
            roles={roles}
            claim={claim}
            claims={claims}
            allClaims={allClaims}
            claimFilter={claimFilter}
            onNotice={setNotice}
            onClaimChange={setClaim}
            onFilterChange={async (filter) => {
              setClaimFilter(filter);
              await refreshClaims(bookId, filter);
            }}
            onLedgerChanged={refreshLedgerSurfaces}
          />

          <BankReconPanel bookId={bookId} recon={recon} onRefresh={() => refreshRecon()} />

          <ClaimPaymentPanel
            bookId={bookId}
            roles={roles}
            claim={claim}
            statements={statements}
            onNotice={setNotice}
            onClaimChange={setClaim}
            onLedgerChanged={refreshLedgerSurfaces}
          />

          {roles.includes("gm") ? <UsersPanel onNotice={setNotice} /> : null}

          <PayrollPanel
            bookId={bookId}
            roles={roles}
            onNotice={setNotice}
            onLedgerChanged={refreshLedgerSurfaces}
          />

          <FixedAssetsPanel
            bookId={bookId}
            roles={roles}
            onNotice={setNotice}
            onLedgerChanged={refreshLedgerSurfaces}
          />

          <ReportsPanel bookId={bookId} roles={roles} onNotice={setNotice} />

          <ArchivePanel bookId={bookId} roles={roles} onNotice={setNotice} />

          <TrialBalanceTable rows={rows} />
        </>
      )}
    </main>
  );
}
