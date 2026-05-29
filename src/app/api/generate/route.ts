import { NextRequest } from "next/server";
import { compose } from "@/lib/anthropic";
import { buildUserText } from "@/lib/prompts";

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
    const userText = buildUserText(body);
    const result = await compose(userText);
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成に失敗しました";
    return Response.json({ error: message }, { status: 500 });
  }
}
