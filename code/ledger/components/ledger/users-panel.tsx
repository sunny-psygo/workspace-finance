"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiCall } from "./api";
import type { User } from "./types";

export function UsersPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [users, setUsers] = useState<Array<User & { active: boolean }>>([]);

  async function refresh() {
    const payload = await apiCall<{ users: Array<User & { active: boolean }> }>("/api/auth/users");
    setUsers(payload.users);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roles = String(form.get("roles") || "employee")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    await apiCall("/api/auth/users", {
      username: form.get("username"),
      displayName: form.get("displayName"),
      password: form.get("password"),
      roles,
    });
    onNotice("账号已创建");
    await refresh();
  }

  return (
    <section className="mt-6">
      <Card>
        <form onSubmit={createUser}>
          <CardTitle>账号管理（总经理）</CardTitle>
          <Input className="mt-3" name="username" placeholder="用户名" required />
          <Input className="mt-2" name="displayName" placeholder="显示名" required />
          <Input className="mt-2" name="password" type="password" placeholder="初始密码至少8位" required />
          <Input className="mt-2" name="roles" placeholder="角色，逗号分隔" defaultValue="employee" required />
          <Button className="mt-3" type="submit">
            创建账号
          </Button>
          <Button className="mt-3 ml-2" type="button" onClick={() => void refresh()}>
            刷新列表
          </Button>
        </form>
        <ul className="mt-3 space-y-1 text-sm">
          {users.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2">
              <span>
                {row.username} · {row.displayName} · {row.roles.join(",")} · {row.active ? "启用" : "停用"}
              </span>
              <Button
                type="button"
                onClick={async () => {
                  await apiCall(`/api/auth/users/${row.id}/active`, { active: !row.active });
                  await refresh();
                }}
              >
                {row.active ? "停用" : "启用"}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
