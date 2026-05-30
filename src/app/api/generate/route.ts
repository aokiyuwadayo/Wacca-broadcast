import { NextRequest } from "next/server";
import { compose } from "@/lib/anthropic";
import { buildUserText } from "@/lib/prompts";
import { fetchEventSource } from "@/lib/fetch-url";

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

    // URL が来たら、まずページを取得・抽出して rawText に流し込む（イベント告知向け）
    if (typeof body.url === "string" && body.url.trim()) {
      const source = await fetchEventSource(body.url.trim());
      body.rawText = `${source}\n\n（上記はイベントページから取得した情報。ここからイベント告知を作成して。読み取れない項目は「（要確認）」で示す）`;
      delete body.url;
    }

    const userText = buildUserText(body);
    const result = await compose(userText);
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成に失敗しました";
    return Response.json({ error: message }, { status: 500 });
  }
}
