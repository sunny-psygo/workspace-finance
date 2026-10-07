"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiCall } from "./api";
import { defaultView, visibleNavGroups, viewTitles, type AppView } from "./nav";
import type { User } from "./types";

type Book = { id: string; name: string };

export function AppShell({
  user,
  books,
  bookId,
  notice,
  view,
  onViewChange,
  onSelectBook,
  onLogout,
  onPasswordChanged,
  children,
}: {
  user: User;
  books: Book[];
  bookId: string;
  notice: string;
  view: AppView;
  onViewChange: (view: AppView) => void;
  onSelectBook: (bookId: string) => void | Promise<void>;
  onLogout: () => void | Promise<void>;
  onPasswordChanged: () => void | Promise<void>;
  children: ReactNode;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const groups = useMemo(() => visibleNavGroups(user.roles), [user.roles]);
  const title = viewTitles[view];

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiCall("/api/auth/change-password", {
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
    });
    setShowPassword(false);
    await onPasswordChanged();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="系统导航">
        <div className="sidebar-brand">
          <strong>创意考拉</strong>
          <span>无纸化审批</span>
        </div>
        <nav className="nav-list">
          {groups.map((group) => (
            <div key={group.title} className="nav-group">
              <div className="nav-group-title">{group.title}</div>
              {group.items.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  className={`nav-item${view === item.view ? " active" : ""}`}
                  onClick={() => onViewChange(item.view)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{title}</h1>
            <p>财务工作台 · 与旧系统同一套导航骨架</p>
          </div>
          <div className="topbar-actions">
            <label className="book-chip">
              账套
              <select
                value={bookId}
                onChange={(event) => void onSelectBook(event.target.value)}
                disabled={books.length === 0}
              >
                {books.length === 0 ? <option value="">尚未开账</option> : null}
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="user-badge">
              {user.displayName} · {user.roles.join(",")}
            </span>
            <Button variant="ghost" type="button" onClick={() => setShowPassword((v) => !v)}>
              修改密码
            </Button>
            <Button variant="ghost" type="button" onClick={() => void onLogout()}>
              退出登录
            </Button>
          </div>
        </header>

        {showPassword ? (
          <form className="notice-bar grid gap-2 md:grid-cols-[1fr_1fr_auto]" onSubmit={changePassword}>
            <Input name="currentPassword" type="password" placeholder="当前密码" required />
            <Input name="newPassword" type="password" placeholder="新密码至少8位" required />
            <Button type="submit">保存新密码</Button>
          </form>
        ) : null}

        {notice ? <div className="notice-bar">{notice}</div> : null}

        <div className="view-panel">{children}</div>
      </div>
    </div>
  );
}

export function initialViewFor(user: User): AppView {
  return defaultView(user.roles);
}
