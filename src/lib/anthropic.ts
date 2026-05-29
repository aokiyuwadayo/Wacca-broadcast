import Anthropic from "@anthropic-ai/sdk";
import { COMPOSE_TOOL, type ComposeResult } from "./schema";
import { SYSTEM } from "./prompts";

// 既定は Sonnet 4.6：文章構成の質が高く、この規模ならコストも 1 本あたり数円〜数十円で済む。
// コストが効いてくる大規模時は ANTHROPIC_MODEL=claude-haiku-4-5-20251001 に切り替えると激安になる。
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function compose(userText: string): Promise<ComposeResult> {
  const resp = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2048,
    // system プロンプトは毎回同じなので prompt caching でキャッシュする（コスト削減）
    system: [
      {
        type: "text",
        text: SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [COMPOSE_TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: "tool", name: COMPOSE_TOOL.name },
    messages: [{ role: "user", content: userText }],
  });

  const toolUse = resp.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("モデルが構造化結果を返しませんでした");
  }
  return toolUse.input as ComposeResult;
}
