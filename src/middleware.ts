import { NextRequest, NextResponse } from "next/server";

// 簡易パスワード保護（Basic 認証）。
// 環境変数 SITE_PASSWORD が設定されているときだけ有効。
// - Vercel など公開環境では必ず設定する（URL を知る人が中央 API キーを叩いて課金される事故を防ぐ）
// - ローカル開発では未設定でよい（その場合は素通り）
export function middleware(req: NextRequest) {
  const pwEnv = process.env.SITE_PASSWORD;
  if (!pwEnv) return NextResponse.next();

  // カンマ区切りで複数パスワードに対応（複数管理者）
  const validPasswords = pwEnv.split(",").map((p) => p.trim()).filter(Boolean);

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const password = decoded.slice(decoded.indexOf(":") + 1);
      if (validPasswords.includes(password)) return NextResponse.next();
    }
  }

  return new NextResponse("認証が必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Wacca Cast", charset="UTF-8"' },
  });
}

// 静的アセット以外の全ルート（API 含む）を保護
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
