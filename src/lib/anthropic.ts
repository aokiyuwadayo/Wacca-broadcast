import Anthropic from "@anthropic-ai/sdk";
import { COMPOSE_TOOL, type ComposeResult } from "./schema";
import { SYSTEM } from "./prompts";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

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
