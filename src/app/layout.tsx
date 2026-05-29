import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YUWA Broadcast",
  description: "サークルの告知をふんわりメモから各PF向けに生成するツール（Phase A）",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
