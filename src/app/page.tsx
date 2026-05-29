"use client";

import { useState } from "react";
import type {
  BroadcastJson,
  BroadcastKind,
  ComposeResult,
  MissingField,
  Platforms,
} from "@/lib/schema";

type PlatformKey = keyof Platforms;
const PLATFORM_LABELS: Record<PlatformKey, string> = {
  line: "LINE",
  teams: "Teams",
  discord: "Discord",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [kind, setKind] = useState<BroadcastKind>("activity");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<ComposeResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<PlatformKey>("line");
  const [refine, setRefine] = useState("");
  const [copied, setCopied] = useState<PlatformKey | null>(null);

  async function callApi(payload: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, today: todayISO(), ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました");
      setResult(data as ComposeResult);
      setAnswers({});
      setRefine("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  // 1) ふんわりメモから生成
  function handleGenerate() {
    if (!rawText.trim()) return;
    callApi({ rawText });
  }

  // 2) 不足項目に回答して再生成（回答を追記してメモごと再投入）
  function handleAnswer() {
    const lines = Object.entries(answers)
      .filter(([, v]) => v.trim())
      .map(([field, v]) => `${field}: ${v}`)
      .join("\n");
    callApi({ rawText: `${rawText}\n\n[追加回答]\n${lines}` });
  }

  // 3) フォーム編集後、JSONから再生成
  function handleRegenFromJson(json: BroadcastJson) {
    callApi({ json });
  }

  // 4) AIに相談して修正
  function handleRefine() {
    if (!result || !refine.trim()) return;
    callApi({ json: result.json, instruction: refine });
  }

  async function copy(key: PlatformKey) {
    if (!result) return;
    await navigator.clipboard.writeText(result.platforms[key]);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-brand">YUWA Broadcast</h1>
        <p className="text-sm text-slate-500">
          ふんわりメモ → 各プラットフォーム向け告知文（Phase A・コピペ版）
        </p>
      </header>

      {/* 種別タブ */}
      <div className="mb-4 flex gap-2">
        {(["activity", "event"] as BroadcastKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              kind === k
                ? "bg-brand text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {k === "activity" ? "🗓 活動告知" : "🎤 イベント告知"}
          </button>
        ))}
      </div>

      {/* 入力 */}
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          ふんわりメモ（順番も体裁もぐちゃぐちゃでOK）
        </label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={5}
          placeholder="例：来週木曜 16:30〜 E棟3階R教室で立花祭の出展内容を決める。持ち物なし。"
          className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading || !rawText.trim()}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {loading ? "生成中…" : "下書きを作る"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </section>

      {result && (
        <>
          {/* 不足項目（ガイド） */}
          {result.missing.length > 0 && (
            <section className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <h2 className="mb-2 text-sm font-semibold text-amber-800">
                ⚠️ あと少し教えて（必須）
              </h2>
              <div className="space-y-2">
                {result.missing.map((m: MissingField) => (
                  <div key={m.field}>
                    <label className="block text-sm text-amber-900">
                      {m.question}
                    </label>
                    <input
                      value={answers[m.field] ?? ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [m.field]: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-amber-300 p-2 text-sm focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleAnswer}
                disabled={loading}
                className="mt-3 rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                回答して作り直す
              </button>
            </section>
          )}

          {/* AIの推測（assumptions） */}
          {result.assumptions.length > 0 && (
            <section className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
              <p className="mb-1 font-semibold">🤖 AIが補完した点（確認してね）</p>
              <ul className="list-disc pl-5">
                {result.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          )}

          {/* PF別プレビュー＋コピー */}
          <section className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex gap-2">
              {(Object.keys(PLATFORM_LABELS) as PlatformKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === k
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {PLATFORM_LABELS[k]}
                </button>
              ))}
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-relaxed">
              {result.platforms[tab]}
            </pre>
            <button
              onClick={() => copy(tab)}
              className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              {copied === tab ? "✅ コピーした！" : `📋 ${PLATFORM_LABELS[tab]}版をコピー`}
            </button>
          </section>

          {/* AIに相談して修正 */}
          <section className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              💬 気になる所をAIに相談して修正
            </label>
            <div className="flex gap-2">
              <input
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                placeholder="例：LINE版もっと短く / もっと熱く / 流れの3つは消して"
                className="flex-1 rounded-lg border border-slate-300 p-2 text-sm focus:border-brand focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleRefine()}
              />
              <button
                onClick={handleRefine}
                disabled={loading || !refine.trim()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                修正
              </button>
            </div>
          </section>

          {/* フォーム編集（フォーム型モード：中間JSONを直接いじって再生成） */}
          <JsonForm
            json={result.json}
            loading={loading}
            onRegen={handleRegenFromJson}
          />
        </>
      )}

      <footer className="mt-8 text-center text-xs text-slate-400">
        YUWA Broadcast · Phase A · 設計は docs/design-doc.md
      </footer>
    </main>
  );
}

// 中間JSONを直接編集するフォーム（design-doc §7 のフォーム型モード）
function JsonForm({
  json,
  loading,
  onRegen,
}: {
  json: BroadcastJson;
  loading: boolean;
  onRegen: (json: BroadcastJson) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BroadcastJson>(json);
  // 開くたびに最新の json で draft を初期化する（下の onClick で setDraft(json)）

  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <button
        onClick={() => {
          setDraft(json);
          setOpen(!open);
        }}
        className="text-sm font-medium text-brand"
      >
        {open ? "▼" : "▶"} 項目を直接編集（フォーム型）
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <Field
            label="タイトル"
            value={draft.title}
            onChange={(v) => setDraft({ ...draft, title: v })}
          />
          <Field
            label="日時（開始）"
            value={draft.datetime.start}
            onChange={(v) =>
              setDraft({ ...draft, datetime: { ...draft.datetime, start: v } })
            }
          />
          <Field
            label="場所"
            value={draft.location.name}
            onChange={(v) =>
              setDraft({ ...draft, location: { ...draft.location, name: v } })
            }
          />
          <Field
            label="今回やること"
            value={draft.summary}
            onChange={(v) => setDraft({ ...draft, summary: v })}
          />
          <Field
            label="流れ（カンマ区切り）"
            value={draft.body.join("、")}
            onChange={(v) =>
              setDraft({
                ...draft,
                body: v.split(/[、,]/).map((s) => s.trim()).filter(Boolean),
              })
            }
          />
          <Field
            label="持ち物（カンマ区切り）"
            value={draft.bring.join("、")}
            onChange={(v) =>
              setDraft({
                ...draft,
                bring: v.split(/[、,]/).map((s) => s.trim()).filter(Boolean),
              })
            }
          />
          <Field
            label="推しポイント(hook)"
            value={draft.hook}
            onChange={(v) => setDraft({ ...draft, hook: v })}
          />
          <Field
            label="補足メモ"
            value={draft.note}
            onChange={(v) => setDraft({ ...draft, note: v })}
          />
          <button
            onClick={() => onRegen(draft)}
            disabled={loading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            この内容で作り直す
          </button>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-brand focus:outline-none"
      />
    </div>
  );
}
