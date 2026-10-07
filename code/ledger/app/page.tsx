"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchivePanel } from "@/components/ledger/archive-panel";
import { apiCall, setApiNoticeHandler } from "@/components/ledger/api";
import { AppShell, initialViewFor } from "@/components/ledger/app-shell";
import { BankReconPanel } from "@/components/ledger/bank-recon-panel";
import { BookSetupPanel, PeriodClosePanel } from "@/components/ledger/book-panel";
import { ClaimPaymentPanel, ClaimsPanel } from "@/components/ledger/claims-panel";
import { FixedAssetsPanel } from "@/components/ledger/fixed-assets-panel";
import { JournalPanel } from "@/components/ledger/journal-panel";
import { LoginCard } from "@/components/ledger/login-card";
import type { AppView } from "@/components/ledger/nav";
import { PayrollPanel } from "@/components/ledger/payroll-panel";
import { ReportsPanel } from "@/components/ledger/reports-panel";
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
 * 页面只做编排：会话、账套、当前视图。
 * 壳层对齐旧系统；业务仍是可组合面板积木。
 */
export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>("claims");
  const [bookId, setBookId] = useState("");
  const [books, setBooks] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [claimFilter, setClaimFilter] = useState("all");
  const [statements, setStatements] = useState<Statement[]>([]);
  const [recon, setRecon] = useState<BankRecon | null>(null);
  const [notice, setNotice] = useState("先登录。");

  const roles = user?.roles ?? [];

  /** 待付款列表：优先用银行调节里的 openClaims，保证未付金额一致。 */
  const payableClaims = useMemo(() => recon?.openClaims ?? [], [recon]);

  useEffect(() => {
    setApiNoticeHandler(setNotice);
    return () => setApiNoticeHandler(null);
  }, []);

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
    if (!id) return;
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
        setView(initialViewFor(payload.user));
        const list = await refreshBooks();
        if (list[0]) await selectBook(list[0].id);
      })
      .catch(() => setUser(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(next: User) {
    setUser(next);
    setView(initialViewFor(next));
    setNotice(`已登录：${next.displayName}`);
    const list = await refreshBooks();
    if (list[0]) await selectBook(list[0].id);
  }

  async function handleLogout() {
    await apiCall("/api/auth/logout", {});
    setUser(null);
    setNotice("已退出。");
  }

  if (!user) {
    return <LoginCard onLogin={handleLogin} />;
  }

  return (
    <AppShell
      user={user}
      books={books}
      bookId={bookId}
      notice={notice}
      view={view}
      onViewChange={setView}
      onSelectBook={selectBook}
      onLogout={handleLogout}
      onPasswordChanged={async () => {
        setUser(null);
        setNotice("密码已更新，请重新登录。");
      }}
    >
      {view === "claims" ? (
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
      ) : null}

      {view === "payment" ? (
        <>
          <ClaimPaymentPanel
            bookId={bookId}
            roles={roles}
            claim={claim}
            statements={statements}
            payableClaims={payableClaims}
            onNotice={setNotice}
            onClaimChange={setClaim}
            onLedgerChanged={refreshLedgerSurfaces}
          />
          <BankReconPanel bookId={bookId} recon={recon} onRefresh={() => refreshRecon()} />
        </>
      ) : null}

      {view === "payroll" ? (
        <PayrollPanel
          bookId={bookId}
          roles={roles}
          onNotice={setNotice}
          onLedgerChanged={refreshLedgerSurfaces}
        />
      ) : null}

      {view === "fixedAssets" ? (
        <FixedAssetsPanel
          bookId={bookId}
          roles={roles}
          onNotice={setNotice}
          onLedgerChanged={refreshLedgerSurfaces}
        />
      ) : null}

      {view === "bookSetup" ? (
        <BookSetupPanel
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
        />
      ) : null}

      {view === "periodClose" ? (
        <PeriodClosePanel
          bookId={bookId}
          roles={roles}
          onNotice={setNotice}
          onRefreshBalance={() => refreshBalance()}
        />
      ) : null}

      {view === "journal" ? (
        <JournalPanel bookId={bookId} roles={roles} onNotice={setNotice} />
      ) : null}

      {view === "reports" ? (
        <ReportsPanel bookId={bookId} roles={roles} onNotice={setNotice} />
      ) : null}

      {view === "archive" ? (
        <ArchivePanel bookId={bookId} roles={roles} onNotice={setNotice} />
      ) : null}

      {view === "trialBalance" ? <TrialBalanceTable rows={rows} /> : null}

      {view === "users" ? <UsersPanel onNotice={setNotice} /> : null}
    </AppShell>
  );
}
