import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wacca Cast",
  description: "Wacca の告知配信機能。ふんわりメモから各SNS向けの告知文を生成（輪っか＝サークルの輪）",
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
