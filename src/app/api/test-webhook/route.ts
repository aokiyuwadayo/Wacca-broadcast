import { NextRequest } from "next/server";
import { checkPublicUrl } from "@/lib/url-safety";

// 接続先（Discord/Teams/Slack の Webhook）へ「テスト1通」を実際に送るエンドポイント。
// 設計の鉄則「実際に1通届くまで接続済みにしない（silent fail 防止）」を満たすための土台。
// 保存前の入力 URL を直接受け取って検証できるようにしている（DB保存と独立）。

export const runtime = "nodejs";

const TEST_MESSAGE =
  "✅ Wacca Cast 接続テスト：このメッセージが届いていれば設定はOKです。";

export async function POST(req: NextRequest) {
  const { platform, url } = await req.json();
  if (!platform || !url) {
    return Response.json({ error: "platform と url は必須です" }, { status: 400 });
  }

  // Webhook は https 必須＋内部ホスト遮断（SSRF対策）
  const check = checkPublicUrl(url, { requireHttps: true });
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 400 });
  }
  const u = check.url;

  // 各PFの Webhook が期待する本文形式（cron/daily・post と揃える）
  const body =
    platform === "discord"
      ? { content: TEST_MESSAGE }
      : platform === "teams" || platform === "slack"
        ? { text: TEST_MESSAGE }
        : null;
  if (!body) {
    return Response.json({ error: "未対応のプラットフォームです" }, { status: 400 });
  }

  try {
    const res = await fetch(u.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return Response.json(
        {
          error: `送信に失敗しました (HTTP ${res.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`,
        },
        { status: 502 },
      );
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "送信できませんでした（URL誤り・到達不可・タイムアウトなど）" },
      { status: 502 },
    );
  }
}
