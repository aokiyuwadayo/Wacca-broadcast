import { NextRequest } from "next/server";
import { getServerDb } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { platform, text } = await req.json();
  if (!platform || !text) {
    return Response.json({ error: "platform と text は必須です" }, { status: 400 });
  }

  const { data: settings } = await getServerDb()
    .from("settings")
    .select("discord_webhook, teams_webhook")
    .limit(1)
    .maybeSingle();

  if (!settings) {
    return Response.json({ error: "設定が見つかりません" }, { status: 404 });
  }

  if (platform === "discord") {
    const webhookUrl = settings.discord_webhook;
    if (!webhookUrl) {
      return Response.json({ error: "Discord Webhook URL が未設定です" }, { status: 400 });
    }
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    if (!res.ok) {
      return Response.json({ error: `Discord への送信に失敗しました (${res.status})` }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  if (platform === "teams") {
    const webhookUrl = settings.teams_webhook;
    if (!webhookUrl) {
      return Response.json({ error: "Teams Workflow URL が未設定です" }, { status: 400 });
    }
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      return Response.json({ error: `Teams への送信に失敗しました (${res.status})` }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "未対応のプラットフォームです" }, { status: 400 });
}
