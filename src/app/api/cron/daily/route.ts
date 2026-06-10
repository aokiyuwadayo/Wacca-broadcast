import { getServerDb } from "@/lib/supabase-server";
import { compose } from "@/lib/anthropic";
import { buildUserText } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

async function sendSlack(webhookUrl: string, text: string) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

async function sendWebhook(url: string, platform: "discord" | "teams" | "slack", text: string) {
  const body =
    platform === "discord" ? { content: text } : { text };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export async function GET(req: Request) {
  // Vercel Cron の認証
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServerDb();
  const results: string[] = [];

  // 今日の日付（JST: UTC+9）
  const nowUtc = new Date();
  const nowJst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = nowJst.toISOString().slice(0, 10); // YYYY-MM-DD
  const todayDow = nowJst.getDay(); // 0=日 〜 6=土

  // ① 予約投稿の処理
  const { data: pendingPosts } = await db
    .from("scheduled_posts")
    .select("*")
    .eq("scheduled_date", todayStr)
    .eq("status", "pending");

  const { data: settings } = await db.from("settings").select("*").limit(1).maybeSingle();

  for (const post of pendingPosts ?? []) {
    const webhookUrl =
      post.platform === "discord"
        ? settings?.discord_webhook
        : post.platform === "slack"
          ? settings?.slack_announce_webhook
          : settings?.teams_webhook;
    if (!webhookUrl) {
      await db.from("scheduled_posts").update({ status: "failed", error: "Webhook URL 未設定" }).eq("id", post.id);
      continue;
    }
    const ok = await sendWebhook(webhookUrl, post.platform, post.text);
    await db.from("scheduled_posts").update({
      status: ok ? "sent" : "failed",
      sent_at: ok ? new Date().toISOString() : null,
      error: ok ? null : "送信失敗",
    }).eq("id", post.id);
    results.push(`予約投稿 ${post.platform}: ${ok ? "成功" : "失敗"}`);

    // Slack に結果通知
    if (settings?.slack_webhook) {
      await sendSlack(
        settings.slack_webhook,
        ok
          ? `✅ 予約投稿を送信しました（${post.platform}）`
          : `⚠️ 予約投稿の送信に失敗しました（${post.platform}）\nコピペで手動投稿してください：\n${post.text}`,
      );
    }
  }

  // ② 定期スケジュールのリマインド
  const { data: schedules } = await db
    .from("regular_schedules")
    .select("*")
    .eq("active", true);

  for (const sched of schedules ?? []) {
    // 次回の活動日を計算
    const daysUntil = ((sched.day_of_week - todayDow + 7) % 7) || 7;
    if (daysUntil !== sched.remind_days_before) continue; // リマインド日でない

    // 活動日の日付を計算
    const activityDate = new Date(nowJst);
    activityDate.setDate(activityDate.getDate() + daysUntil);
    const dateStr = activityDate.toISOString().slice(0, 10);
    const [year, month, day] = dateStr.split("-");
    const dateLabel = `${parseInt(month)}/${parseInt(day)}(${DAY_NAMES[sched.day_of_week]})`;

    // AI で下書き生成
    let draft = "";
    try {
      const rawText = [
        `${dateLabel} ${sched.time_str}〜`,
        sched.location && `場所: ${sched.location}`,
        sched.summary_template && `内容: ${sched.summary_template}`,
      ].filter(Boolean).join("\n");

      const profile = settings
        ? { circle_name: settings.circle_name, leader_name: settings.leader_name }
        : undefined;
      const userText = buildUserText({ kind: "activity", rawText, today: dateStr, profile });
      const result = await compose(userText);
      draft = result.platforms?.line ?? "";
    } catch {
      draft = "（生成に失敗しました。メモから手動で作成してください）";
    }

    // Slack に通知
    if (settings?.slack_webhook) {
      await sendSlack(
        settings.slack_webhook,
        `📣 *${dateLabel} ${sched.time_str}〜 の活動告知、まだですか？*\n\nAIが下書きを作りました👇\n\`\`\`\n${draft}\n\`\`\`\n\nWacca Cast で仕上げて投稿してね → ${process.env.NEXT_PUBLIC_APP_URL ?? "https://wacca-broadcast.vercel.app"}`,
      );
      results.push(`定期リマインド: ${dateLabel}`);
    }
  }

  return Response.json({ ok: true, results, date: todayStr });
}
