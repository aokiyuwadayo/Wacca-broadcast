import { NextRequest } from "next/server";

// 接続先（Discord/Teams/Slack の Webhook）へ「テスト1通」を実際に送るエンドポイント。
// 設計の鉄則「実際に1通届くまで接続済みにしない（silent fail 防止）」を満たすための土台。
// 保存前の入力 URL を直接受け取って検証できるようにしている（DB保存と独立）。

export const runtime = "nodejs";

// SSRF 対策：内部・ループバック宛を弾く（fetch-url.ts と同じ方針）
const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i;

const TEST_MESSAGE =
  "✅ Wacca Cast 接続テスト：このメッセージが届いていれば設定はOKです。";

export async function POST(req: NextRequest) {
  const { platform, url } = await req.json();
  if (!platform || !url) {
    return Response.json({ error: "platform と url は必須です" }, { status: 400 });
  }

  let u: URL;
  try {
    u = new URL(String(url));
  } catch {
    return Response.json({ error: "URL の形式が正しくありません" }, { status: 400 });
  }
  if (u.protocol !== "https:") {
    return Response.json({ error: "https の Webhook URL を指定してください" }, { status: 400 });
  }
  if (PRIVATE_HOST.test(u.hostname)) {
    return Response.json({ error: "この URL には送信できません" }, { status: 400 });
  }

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
