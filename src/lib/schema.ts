// 中間JSON（すべての心臓）。design-doc.md §4 に対応。
// この1個の構造から各プラットフォーム向け文面を派生させる。

export type BroadcastKind = "activity" | "event";

export interface BroadcastJson {
  kind: BroadcastKind;
  title: string;
  datetime: { start: string; end: string | null };
  location: { name: string; access: string; online_url: string };
  summary: string; // 今回やること（必須）
  body: string[]; // 流れ。AIが提案→ユーザー確認で確定
  bring: string[];
  rsvp: { method: string; deadline: string } | null;
  fee: string | null;
  guests: string[];
  cta: string | null;
  hook: string; // 今回の推しポイント／意欲喚起
  note: string; // 補足メモ（会場固有の事情等を吸収）
  links: { label: string; url: string }[];
  images: string[];
}

export interface MissingField {
  field: string;
  question: string; // ユーザーに聞く日本語の質問
}

export interface Platforms {
  line: string;
  teams: string;
  discord: string;
}

export interface ComposeResult {
  json: BroadcastJson;
  missing: MissingField[]; // 必須なのに埋まっていない項目
  assumptions: string[]; // AIが推測で補完した点（特に body）
  platforms: Platforms;
}

// Anthropic tool（structured output を強制するためのツール定義）
export const COMPOSE_TOOL = {
  name: "compose_broadcast",
  description:
    "ふんわりメモまたは確定JSONから、中間JSONを組み立て、各プラットフォーム向けの告知文を生成して返す。",
  input_schema: {
    type: "object",
    properties: {
      json: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["activity", "event"] },
          title: { type: "string" },
          datetime: {
            type: "object",
            properties: {
              start: {
                type: "string",
                description: "ISO風 (例 2026-06-04T16:30)。不明なら空文字",
              },
              end: { type: ["string", "null"] },
            },
            required: ["start", "end"],
          },
          location: {
            type: "object",
            properties: {
              name: { type: "string" },
              access: { type: "string" },
              online_url: { type: "string" },
            },
            required: ["name", "access", "online_url"],
          },
          summary: { type: "string" },
          body: { type: "array", items: { type: "string" } },
          bring: { type: "array", items: { type: "string" } },
          rsvp: {
            type: ["object", "null"],
            properties: {
              method: { type: "string" },
              deadline: { type: "string" },
            },
          },
          fee: { type: ["string", "null"] },
          guests: { type: "array", items: { type: "string" } },
          cta: { type: ["string", "null"] },
          hook: { type: "string" },
          note: { type: "string" },
          links: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                url: { type: "string" },
              },
              required: ["label", "url"],
            },
          },
          images: { type: "array", items: { type: "string" } },
        },
        required: [
          "kind",
          "title",
          "datetime",
          "location",
          "summary",
          "body",
          "bring",
          "rsvp",
          "fee",
          "guests",
          "cta",
          "hook",
          "note",
          "links",
          "images",
        ],
      },
      missing: {
        type: "array",
        description:
          "必須(title/datetime.start/location.name/summary)なのに埋まっていない項目と、それを聞く日本語の質問",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            question: { type: "string" },
          },
          required: ["field", "question"],
        },
      },
      assumptions: {
        type: "array",
        description: "AIが推測で補完した点（特に body の流れ）。ユーザー確認用。",
        items: { type: "string" },
      },
      platforms: {
        type: "object",
        properties: {
          line: { type: "string" },
          teams: { type: "string" },
          discord: { type: "string" },
        },
        required: ["line", "teams", "discord"],
      },
    },
    required: ["json", "missing", "assumptions", "platforms"],
  },
} as const;
