"use client";

import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiCall } from "./api";
import type { User } from "./types";

export function SessionHeader({
  user,
  notice,
  onLogout,
  onPasswordChanged,
}: {
  user: User | null;
  notice: string;
  onLogout: () => void | Promise<void>;
  onPasswordChanged: () => void | Promise<void>;
}) {
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiCall("/api/auth/change-password", {
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
    });
    await onPasswordChanged();
  }

  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm text-stone-500">登录 · 附件 · 发票查重 · 审批 · 银行流水匹配</p>
        <h1 className="mt-1 text-3xl font-semibold">账本</h1>
        <p className="mt-2 text-stone-600">{notice}</p>
      </div>
      {user ? (
        <div className="text-right text-sm">
          <p>{user.displayName}</p>
          <p className="text-stone-500">{user.roles.join(", ")}</p>
          <form className="mt-2 space-y-1" onSubmit={changePassword}>
            <Input name="currentPassword" type="password" placeholder="当前密码" required />
            <Input name="newPassword" type="password" placeholder="新密码至少8位" required />
            <Button type="submit">改密</Button>
          </form>
          <Button className="mt-2" onClick={() => void onLogout()}>
            退出
          </Button>
        </div>
      ) : null}
    </header>
  );
}
