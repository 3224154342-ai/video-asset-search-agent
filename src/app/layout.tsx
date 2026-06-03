import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "视频素材搜索 Agent",
  description: "Shot-based video material search prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
