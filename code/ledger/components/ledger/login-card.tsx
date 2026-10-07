"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiCall } from "./api";
import type { User } from "./types";

export function LoginCard({
  onLogin,
}: {
  onLogin: (user: User) => void | Promise<void>;
}) {
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const payload = await apiCall<{ user: User }>("/api/auth/login", {
        username: form.get("username"),
        password: form.get("password"),
      });
      await onLogin(payload.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  }

  return (
    <section className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <img src="/koala-logo.svg" alt="创意考拉" />
          <div>
            <div className="login-brand-name">创意考拉</div>
            <div className="login-system-title">公司内部无纸化报销系统</div>
          </div>
        </div>
        <label>
          登录账号
          <Input name="username" autoComplete="username" placeholder="请输入登录账号" required />
        </label>
        <label>
          登录密码
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="请输入密码"
            required
          />
        </label>
        {error ? <p className="login-help" style={{ color: "#b42318" }}>{error}</p> : null}
        <Button className="w-full" type="submit">
          登录
        </Button>
        <p className="login-help">演示账号：zhangsan / hr / finance / gm / cashier，密码均为 Passw0rd!</p>
      </form>
    </section>
  );
}
