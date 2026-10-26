import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wren 问数 · 企业数据助手",
  description: "基于企业业务语义的自然语言数据分析系统",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
