"use client";

import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiCall } from "./api";
import type { User } from "./types";

export function LoginCard({
  onLogin,
}: {
  onLogin: (user: User) => void | Promise<void>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await apiCall<{ user: User }>("/api/auth/login", {
      username: form.get("username"),
      password: form.get("password"),
    });
    await onLogin(payload.user);
  }

  return (
    <Card className="max-w-md">
      <form onSubmit={submit}>
        <CardTitle>登录</CardTitle>
        <Input className="mt-3" name="username" placeholder="用户名" required />
        <Input className="mt-2" name="password" type="password" placeholder="密码" required />
        <Button className="mt-3" type="submit">
          登录
        </Button>
      </form>
      <p className="mt-4 text-sm text-stone-500">
        演示：zhangsan / hr / finance / gm / cashier，密码均为 Passw0rd!
      </p>
    </Card>
  );
}
