import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wacca（輪っか）",
  description: "サークルの告知をふんわりメモから各SNS向けに生成するツール",
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
