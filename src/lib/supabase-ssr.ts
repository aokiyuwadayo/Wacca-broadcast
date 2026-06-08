// 認証用の @supabase/ssr クライアント（Cookieベースのセッション）。
// 既存の supabase.ts(getSupabase, anon/localStorage) や supabase-server.ts(service_role) とは別物。
// セッションを Cookie に持たせ、middleware（サーバ）から読めるようにするのが目的。
//
// ⚠️ Issue #8 の認証は段階導入。env `REQUIRE_AUTH=1` のときだけ middleware が要求する（既定オフ）。
//    本実装は会社PCで build 検証まで。プロバイダ設定・実機テストは個人PCで（docs/phase-e-auth-plan.md）。

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

/** Route Handler（/auth/confirm, /auth/signout 等）用。next/headers の cookies を使う。 */
export async function createRouteClient() {
  const e = env();
  if (!e) return null;
  const cookieStore = await cookies();
  return createServerClient(e.url, e.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as CookieOptions),
          );
        } catch {
          // Server Component から呼ばれた場合は無視（middleware がセッションを更新する）
        }
      },
    },
  });
}

/**
 * middleware 用。リクエストの Cookie を読み、必要ならレスポンスに書き戻す。
 * Supabase 公式パターン（getAll/setAll で request と response 両方を同期）に準拠。
 * 戻り値の { supabase, response } の response は **そのまま返す**こと（セッション同期のため）。
 */
export function createMiddlewareClient(
  request: NextRequest,
  responseFactory: () => NextResponse,
) {
  const e = env();
  if (!e) return null;
  let response = responseFactory();
  const supabase = createServerClient(e.url, e.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = responseFactory();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as CookieOptions),
        );
      },
    },
  });
  return { supabase, getResponse: () => response };
}
