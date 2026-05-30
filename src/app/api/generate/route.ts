import { NextRequest } from "next/server";
import { compose } from "@/lib/anthropic";
import { buildUserText } from "@/lib/prompts";
import { fetchEventSource } from "@/lib/fetch-url";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY が未設定です。.env.local に設定してください。" },
        { status: 500 },
      );
    }
    const body = await req.json();

    // Supabase クライアント初期化（URL正規化・どんな形式でも動く）
    const rawUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseUrl = rawUrl.startsWith("http")
      ? rawUrl.replace(/\/$/, "")
      : rawUrl
        ? `https://${rawUrl.replace(/\/$/, "")}`
        : `https://zgptvigkdcndcmszjocz.supabase.co`;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // URL が来たら、まずページを取得・抽出して rawText に流し込む（イベント告知向け）
    if (typeof body.url === "string" && body.url.trim()) {
      const source = await fetchEventSource(body.url.trim());
      body.rawText = `${source}\n\n（上記はイベントページから取得した情報。ここからイベント告知を作成して。読み取れない項目は「（要確認）」で示す）`;
      delete body.url;
    }

    // 設定（サークルプロフィール）を取得してプロンプトに渡す
    let profile: Record<string, string> | undefined;
    if (supabaseKey) {
      try {
        const settingsDb = createClient(supabaseUrl, supabaseKey);
        const { data } = await settingsDb.from("settings").select("*").limit(1).maybeSingle();
        if (data) profile = data;
      } catch {
        // 設定取得失敗は無視
      }
    }

    const userText = buildUserText({ ...body, profile });
    const result = await compose(userText);

    // Supabase に保存（env が揃っている時だけ。失敗しても生成結果は返す）
    console.log("[Supabase] url:", supabaseUrl, "key present:", !!supabaseKey);
    if (supabaseKey) {
      try {
        const db = createClient(supabaseUrl, supabaseKey);
        const { error: dbError } = await db.from("broadcasts").insert({
          kind: result.json.kind,
          title: result.json.title,
          json: result.json,
          platforms: result.platforms,
        });
        if (dbError) console.error("[Supabase] insert error:", dbError);
        else console.log("[Supabase] saved:", result.json.title);
      } catch (e) {
        console.error("[Supabase] unexpected error:", e);
      }
    }

    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成に失敗しました";
    return Response.json({ error: message }, { status: 500 });
  }
}
