"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BroadcastRow } from "@/lib/supabase";
import type { BroadcastJson, Platforms } from "@/lib/schema";

type Row = BroadcastRow & { json: BroadcastJson; platforms: Platforms };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => setRows((Array.isArray(data) ? data : []) as Row[]))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  async function duplicate(row: Row) {
    // 前回の json を localStorage に保存してトップページへ
    localStorage.setItem("yb-duplicate", JSON.stringify(row.json));
    window.location.href = "/";
  }

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-white"
        >
          ← 戻る
        </Link>
        <h1 className="text-xl font-bold text-slate-800">📋 履歴</h1>
      </header>

      {loading && <p className="text-center text-sm text-slate-400">読み込み中…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-center text-sm text-slate-400">
          まだ告知が保存されていません。
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row) => {
          const open = expanded === row.id;
          return (
            <div
              key={row.id}
              className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              {/* ヘッダー行 */}
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="text-lg">
                  {row.kind === "activity" ? "🗓" : "🎤"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {row.title}
                  </p>
                  <p className="text-xs text-slate-400">{fmtDate(row.created_at)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => duplicate(row)}
                    className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    複製
                  </button>
                  <button
                    onClick={() => setExpanded(open ? null : row.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    {open ? "閉じる" : "詳細"}
                  </button>
                </div>
              </div>

              {/* 展開：各PF文面 */}
              {open && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                  {(["line", "teams", "discord"] as const).map((pf) => {
                    const text = row.platforms?.[pf];
                    if (!text) return null;
                    const key = `${row.id}-${pf}`;
                    return (
                      <div key={pf} className="mb-4">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase text-slate-400">
                            {pf === "line" ? "💬 LINE" : pf === "teams" ? "💼 Teams" : "🎮 Discord"}
                          </span>
                          <button
                            onClick={() => copyText(text, key)}
                            className="text-xs text-brand hover:underline"
                          >
                            {copied === key ? "✅ コピー済" : "コピー"}
                          </button>
                        </div>
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-700 ring-1 ring-slate-100">
                          {text}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
