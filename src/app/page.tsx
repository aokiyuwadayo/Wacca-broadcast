"use client";

import { useEffect, useState } from "react";
import type {
  BroadcastJson,
  BroadcastKind,
  ComposeResult,
  MissingField,
  Platforms,
} from "@/lib/schema";

type PlatformKey = keyof Platforms;
const PLATFORMS: Record<PlatformKey, { label: string; emoji: string; color: string }> = {
  line: { label: "LINE", emoji: "💬", color: "#06C755" },
  teams: { label: "Teams", emoji: "💼", color: "#4B53BC" },
  discord: { label: "Discord", emoji: "🎮", color: "#5865F2" },
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
  const [preview, setPreview] = useState(false); // 開発時に演出を眺めるためのプレビュー

  // 入力方法（メモ書き / フォーム）と、フォーム入力の中身
  const [inputMode, setInputMode] = useState<"memo" | "form">("memo");
  const [form, setForm] = useState({
    title: "",
    start: "",
    location: "",
    summary: "",
    body: "",
    bring: "",
    hook: "",
    note: "",
    fee: "",
    guests: "",
    cta: "",
  });

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

  // 3') フォーム入力モードから生成（フォームの項目を中間JSONに組み立てて投入）
  const splitList = (v: string) =>
    v.split(/[、,]/).map((s) => s.trim()).filter(Boolean);
  function handleGenerateFromForm() {
    if (!form.title.trim()) return;
    const json: BroadcastJson = {
      kind,
      title: form.title,
      datetime: { start: form.start, end: null },
      location: { name: form.location, access: "", online_url: "" },
      summary: form.summary,
      body: splitList(form.body),
      bring: splitList(form.bring),
      rsvp: null,
      fee: form.fee || null,
      guests: splitList(form.guests),
      cta: form.cta || null,
      hook: form.hook,
      note: form.note,
      links: [],
      images: [],
    };
    callApi({ json });
  }

  // 4) AIに相談して修正
  function handleRefine() {
    if (!result || !refine.trim()) return;
    callApi({ json: result.json, instruction: refine });
  }

  async function copy(key: PlatformKey) {
    if (!result) return;
    await navigator.clipboard.writeText(result.platforms?.[key] ?? "");
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const currentText = result?.platforms?.[tab] ?? "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* ヘッダー */}
      <header className="mb-7 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-accent text-2xl shadow-sm">
          📣
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-brand to-brand-accent bg-clip-text text-transparent">
              YUWA
            </span>
            <span className="text-slate-800"> Broadcast</span>
          </h1>
          <p className="text-xs text-slate-500">
            ふんわりメモ → 各SNS向けの告知文をサッと
          </p>
        </div>
      </header>

      {/* 切替トグル：告知の種類 ＋ 入力方法 */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">
            告知の種類
          </span>
          <div className="flex gap-2">
            {(["activity", "event"] as BroadcastKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                  kind === k
                    ? "bg-brand text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
                }`}
              >
                {k === "activity" ? "🗓 活動告知" : "🎤 イベント告知"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">
            入力方法
          </span>
          <div className="flex gap-2">
            {(
              [
                ["memo", "📝 メモ書き"],
                ["form", "🧾 フォーム入力"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setInputMode(m)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                  inputMode === m
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 入力エリア（メモ書き or フォーム） */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        {inputMode === "memo" ? (
          <>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              ふんわりメモ
              <span className="ml-1 font-normal text-slate-400">
                （順番も体裁もぐちゃぐちゃでOK）
              </span>
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={5}
              placeholder="例：来週木曜 16:30〜 E棟3階R教室で立花祭の出展内容を決める。持ち物なし。"
              className="w-full resize-y rounded-xl border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={loading || !rawText.trim()}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-40"
              >
                {loading ? "生成中…" : "✨ 下書きを作る"}
              </button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm font-semibold text-slate-700">
              フォームで項目を入力
              <span className="ml-1 font-normal text-slate-400">
                （分かるところだけでOK）
              </span>
            </p>
            <div className="space-y-3">
              <Field label="タイトル" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <Field label="日時（例：6/4(木) 16:30〜）" value={form.start} onChange={(v) => setForm({ ...form, start: v })} />
              <Field label="場所" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
              <Field label="今回やること" value={form.summary} onChange={(v) => setForm({ ...form, summary: v })} />
              <Field label="流れ（カンマ区切り）" value={form.body} onChange={(v) => setForm({ ...form, body: v })} />
              <Field label="持ち物（カンマ区切り）" value={form.bring} onChange={(v) => setForm({ ...form, bring: v })} />
              <Field label="推しポイント（来たくなる一言）" value={form.hook} onChange={(v) => setForm({ ...form, hook: v })} />
              <Field label="補足メモ" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
              {kind === "event" && (
                <>
                  <Field label="参加費" value={form.fee} onChange={(v) => setForm({ ...form, fee: v })} />
                  <Field label="登壇者（カンマ区切り）" value={form.guests} onChange={(v) => setForm({ ...form, guests: v })} />
                  <Field label="拡散のお願い" value={form.cta} onChange={(v) => setForm({ ...form, cta: v })} />
                </>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleGenerateFromForm}
                disabled={loading || !form.title.trim()}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-40"
              >
                {loading ? "生成中…" : "✨ 下書きを作る"}
              </button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </>
        )}
      </section>

      {/* 生成中の小ネタ演出 */}
      {(loading || preview) && <GeneratingShow />}

      {result && (
        <>
          {/* 不足項目（ガイド） */}
          {result.missing.length > 0 && (
            <section className="mt-4 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
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
            <section className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
              <p className="mb-1 font-semibold">🤖 AIが補完した点（確認してね）</p>
              <ul className="list-disc pl-5">
                {result.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          )}

          {/* PF別プレビュー＋コピー */}
          <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex items-center gap-2">
              {(Object.keys(PLATFORMS) as PlatformKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  style={tab === k ? { backgroundColor: PLATFORMS[k].color } : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    tab === k
                      ? "text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {PLATFORMS[k].emoji} {PLATFORMS[k].label}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-400">
                {currentText.length}字
                {tab === "line" && currentText.length > 500 && (
                  <span className="ml-1 text-amber-600">（長め）</span>
                )}
              </span>
            </div>
            <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-800 ring-1 ring-slate-100">
              {currentText}
            </pre>
            <button
              onClick={() => copy(tab)}
              style={{ backgroundColor: PLATFORMS[tab].color }}
              className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              {copied === tab
                ? "✅ コピーした！貼り付けてね"
                : `📋 ${PLATFORMS[tab].label}版をコピー`}
            </button>
          </section>

          {/* AIに相談して修正 */}
          <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              💬 気になる所をAIに相談して修正
            </label>
            <div className="flex gap-2">
              <input
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                placeholder="例：LINE版もっと短く / もっと熱く / 流れの3つは消して"
                className="flex-1 rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                onKeyDown={(e) => e.key === "Enter" && handleRefine()}
              />
              <button
                onClick={handleRefine}
                disabled={loading || !refine.trim()}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                修正
              </button>
            </div>
          </section>

          {/* フォーム編集（生成結果の項目を直接いじって再生成） */}
          <JsonForm
            json={result.json}
            loading={loading}
            onRegen={handleRegenFromJson}
          />
        </>
      )}

      <footer className="mt-10 text-center text-xs text-slate-400">
        YUWA Broadcast · Phase A · 設計は docs/design-doc.md
        {process.env.NODE_ENV === "development" && (
          <>
            {" · "}
            <button
              onClick={() => {
                setPreview(true);
                setTimeout(() => setPreview(false), 6000);
              }}
              className="underline hover:text-brand"
            >
              🎬 演出プレビュー
            </button>
          </>
        )}
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
    <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <button
        onClick={() => {
          setDraft(json);
          setOpen(!open);
        }}
        className="text-sm font-semibold text-brand"
      >
        {open ? "▼" : "▶"} 生成結果の項目を直接編集
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
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
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
        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}

// ===== 生成中の小ネタ演出（待ち時間を退屈させない） =====
const LOADING_EMOJI = ["✍️", "🤔", "🧠", "✨", "📝", "🎨", "🔧", "🚀", "💡", "🍵", "🎯", "📣", "🔥", "🙌"];

const LOADING_MESSAGES = [
  "AIが言葉を選んでます…",
  "いちばん刺さる一言を探し中…",
  "絵文字を厳選しています…",
  "LINE版をキュッと短くまとめ中…",
  "Teams版を整理整頓中…",
  "部員が「行きたい！」となる文を調合中…",
  "てにをは を微調整しています…",
  "熱量を 3% 上げています…",
  "改行の位置で本気で悩んでいます…",
  "ちょうどいい敬語を計算中…",
  "誤字を未然に防いでいます…",
  "読みやすさをコネコネ中…",
  "「！」の数を最適化しています…",
  "部長の気持ちを代弁中…",
  "語尾をフレンドリーに寄せています…",
  "見出しを立てています…",
  "スクロールしたくなる構成を設計中…",
  "もうひと味、足しています…",
  "サークルの空気感を読み取り中…",
  "“こんな人に来てほしい”を考え中…",
  "情報ブロックをきれいに揃えています…",
  "Discord版にノリを足しています…",
  "参加したくなる理由を探しています…",
  "あと少し、いい感じになってきた…",
];

const TRIVIA = [
  "豆知識：告知は『日時・場所』が頭にあると参加率が上がりやすい。",
  "豆知識：絵文字は1行に1〜2個が読みやすさのバランス◎。",
  "豆知識：人は『自分ごと』だと感じた瞬間に動く。だから“あなたに”が効く。",
  "豆知識：締切や人数を書くと、そっと背中を押せる。",
  "ひとこと：完璧を待つより、まず出すこと。",
  "豆知識：LINEの長文は3秒で閉じられがち。短さは優しさ。",
  "起業メモ：アイデアは『誰の・何を・解決するか』から。",
  "豆知識：見出しがあるだけで“読む気”は倍ちがう。",
  "ひとこと：迷ったら、いちばん伝えたい1行を先頭に。",
  "豆知識：絵文字の使いすぎは逆に読みにくい。引き算も大事。",
  "今日のラッキー絵文字：🍀",
  "豆知識：告知の最後に『来てね』があると、一歩踏み出しやすい。",
  "ひとこと：いい告知は、書いた人の熱が少しだけ伝わる。",
  "豆知識：箇条書きは3つまでが一番スッと入る。",
];

// --- 演出ビジュアル（生成のたびにランダムで1つ出る） ---

// 💧 ボトルに水が溜まっていく
function BottleShow() {
  return (
    <div className="relative h-20 w-11" title="水を注いでいます">
      <div className="absolute inset-x-3 top-0 h-3 rounded-t bg-slate-300" />
      <div className="absolute inset-x-0 bottom-0 top-2.5 overflow-hidden rounded-b-2xl rounded-t-lg border-2 border-slate-300 bg-white">
        <div
          className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-sky-400 to-sky-300"
          style={{ animation: "yb-fill 2.6s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
}

// 🧻 トイレットペーパーが巻かれて短くなる
function ToiletPaperShow() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-12 w-12">
        <div
          className="absolute inset-0 rounded-full border-4 border-slate-300 bg-white"
          style={{ animation: "yb-spin 1s linear infinite" }}
        >
          <div className="absolute left-1/2 top-1 h-2.5 w-0.5 -translate-x-1/2 rounded bg-slate-300" />
        </div>
      </div>
      <div
        className="w-7 rounded-b bg-slate-100 ring-1 ring-slate-200"
        style={{ animation: "yb-paper 2s ease-in-out infinite" }}
      />
    </div>
  );
}

// ⏱️ タイマーのリングがゼロに向かう
function TimerShow() {
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="#4f46e5"
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          style={{
            animation: "yb-timer 3s linear infinite",
            transformOrigin: "center",
            transform: "rotate(-90deg)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl">
        ⏱️
      </div>
    </div>
  );
}

// 🙌 跳ねる絵文字（くるくる切替）
function EmojiShow() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => v + 1), 600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="animate-bounce text-5xl">
      {LOADING_EMOJI[i % LOADING_EMOJI.length]}
    </div>
  );
}

const VISUALS = [BottleShow, ToiletPaperShow, TimerShow, EmojiShow];

function GeneratingShow() {
  const [tick, setTick] = useState(0);
  // 生成のたびに「演出ビジュアル・メッセージ開始位置・豆知識」をランダムに → 毎回ちょっと違って飽きない
  const [Visual] = useState(() => VISUALS[Math.floor(Math.random() * VISUALS.length)]);
  const [start] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length));
  const [trivia] = useState(() => TRIVIA[Math.floor(Math.random() * TRIVIA.length)]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, []);

  const msg = LOADING_MESSAGES[(start + tick) % LOADING_MESSAGES.length];

  return (
    <section className="mt-4 rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200">
      <div className="flex h-24 items-center justify-center">
        <Visual />
      </div>
      {/* メッセージ（key で切り替えのたびにふわっと） */}
      <p
        key={tick}
        className="mt-2 text-sm font-medium text-slate-700"
        style={{ animation: "yb-fade 0.4s ease" }}
      >
        {msg}
      </p>
      <p className="mt-3 text-xs text-slate-400">{trivia}</p>
    </section>
  );
}
