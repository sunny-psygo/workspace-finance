import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "账本",
  description: "账户、分录、过账",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
