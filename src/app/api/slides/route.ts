import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { BroadcastJson } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

export type Slide = { title: string; bullets: string[] };
export type SlidesResult = { slides: Slide[] };

const SLIDES_TOOL = {
  name: "generate_slides",
  description: "中間JSONからスライド下書きを生成する",
  input_schema: {
    type: "object",
    properties: {
      slides: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["title", "bullets"],
        },
      },
    },
    required: ["slides"],
  },
} as const;

const SLIDES_SYSTEM = `あなたはサークルの告知・活動スライド作成を支援するAIです。
中間JSONを受け取り、generate_slides ツールを使ってスライド構成を返します。

# スライド構成の原則
- 4〜7枚程度に収める
- 各スライドのタイトルは短く（12字以内）
- 箇条書きは1スライドにつき最大5項目
- 絵文字を使って見やすく
- 内容は中間JSONにあるものだけを使う（捏造しない）

# 必ず含めるスライド
1. タイトルスライド（イベントタイトル・サークル名・日時を1〜2行）
2. 基本情報（日時・場所・持ち物）
3. 今回やること（summary）
4. 当日の流れ（body の各項目）

# 任意で含めるスライド（情報があれば）
- 参加するメリット / こんな人に来てほしい（hook から）
- 登壇者・ゲスト
- 参加費・RSVP
- リンク・連絡先・補足

必ず generate_slides ツールのみで出力する。地の文で返答しない。`;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "ANTHROPIC_API_KEY が未設定です" }, { status: 500 });
    }
    const { json }: { json: BroadcastJson } = await req.json();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SLIDES_SYSTEM,
      tools: [SLIDES_TOOL as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "generate_slides" },
      messages: [
        {
          role: "user",
          content: `以下の中間JSONからスライド下書きを生成してください。\n\n${JSON.stringify(json, null, 2)}`,
        },
      ],
    });

    const toolUse = resp.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("スライドの生成に失敗しました");
    }
    return Response.json(toolUse.input as SlidesResult);
  } catch (e) {
    const message = e instanceof Error ? e.message : "スライドの生成に失敗しました";
    return Response.json({ error: message }, { status: 500 });
  }
}
