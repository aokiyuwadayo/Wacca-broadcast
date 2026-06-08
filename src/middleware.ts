import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase-ssr";

// 保護は2系統。既定ではどちらもオフ＝素通り（本番挙動を変えない）。
// 1) SITE_PASSWORD: 簡易 Basic 認証（既存・変更なし。カンマ区切りで複数パスワード可）
// 2) REQUIRE_AUTH=1: Supabase ログイン必須（Issue #8 の段階導入。未ログインは /login へ）
//    env(NEXT_PUBLIC_SUPABASE_URL/ANON_KEY) が無ければゲートしない＝壊さない。

// REQUIRE_AUTH=1 のときだけ Supabase セッションを検証する
async function maybeRequireAuth(req: NextRequest): Promise<NextResponse> {
  if (process.env.REQUIRE_AUTH !== "1") return NextResponse.next();

  const client = createMiddlewareClient(req, () => NextResponse.next({ request: req }));
  if (!client) return NextResponse.next(); // Supabase env 未設定ならゲートしない

  // createServerClient と getUser の間に処理を挟まない（公式の注意）
  const {
    data: { user },
  } = await client.supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  if (!user && !path.startsWith("/login") && !path.startsWith("/auth")) {
    const redirect = req.nextUrl.clone();
    redirect.pathname = "/login";
    return NextResponse.redirect(redirect);
  }
  return client.getResponse(); // セッション同期のため必ずこの response を返す
}

export async function middleware(req: NextRequest) {
  const pwEnv = process.env.SITE_PASSWORD;
  if (pwEnv) {
    // カンマ区切りで複数パスワードに対応（複数管理者）
    const validPasswords = pwEnv.split(",").map((p) => p.trim()).filter(Boolean);

    const auth = req.headers.get("authorization");
    if (auth) {
      const [scheme, encoded] = auth.split(" ");
      if (scheme === "Basic" && encoded) {
        const decoded = atob(encoded);
        const password = decoded.slice(decoded.indexOf(":") + 1);
        if (validPasswords.includes(password)) return maybeRequireAuth(req);
      }
    }

    return new NextResponse("認証が必要です", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Wacca Cast", charset="UTF-8"' },
    });
  }

  return maybeRequireAuth(req);
}

// 静的アセット・PWA資産（manifest/アイコン/画像）は保護対象外
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
