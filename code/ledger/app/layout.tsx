import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "创意考拉 · 财务系统",
  description: "无纸化审批与账务处理",
  icons: {
    icon: "/koala-logo.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
