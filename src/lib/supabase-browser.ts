// ブラウザ用 @supabase/ssr クライアント（Cookieベースのセッション）。
// ログインページなどクライアント側の認証操作で使う。サーバ(middleware)から
// セッションを読めるよう、localStorage ではなく Cookie にセッションを置く。
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClientBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
