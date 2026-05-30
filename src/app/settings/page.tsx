"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  id?: string;
  circle_name: string;
  leader_name: string;
  def_location: string;
  note: string;
};

const EMPTY: Settings = { circle_name: "", leader_name: "", def_location: "", note: "" };

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.circle_name !== undefined) setForm(data);
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const set = (k: keyof Settings) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-white"
        >
          ← 戻る
        </Link>
        <h1 className="text-xl font-bold text-slate-800">⚙️ 設定</h1>
      </header>

      {loading ? (
        <p className="text-center text-sm text-slate-400">読み込み中…</p>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">サークル情報</h2>
            <div className="space-y-3">
              <Field
                label="サークル名"
                placeholder="例：福工大 起業部"
                value={form.circle_name}
                onChange={set("circle_name")}
              />
              <Field
                label="担当者名（部長・告知担当）"
                placeholder="例：青木"
                value={form.leader_name}
                onChange={set("leader_name")}
              />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">よく使うデフォルト</h2>
            <div className="space-y-3">
              <Field
                label="よく使う場所"
                placeholder="例：E棟3階 R教室"
                value={form.def_location}
                onChange={set("def_location")}
              />
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  毎回共通の補足メモ
                </label>
                <p className="mb-1 text-xs text-slate-400">
                  毎回入れなくてもいい定型の注意事項など（例: 19時に教室クローズ）
                </p>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => set("note")(e.target.value)}
                  placeholder="例：終了時刻は未定でも19時には退室してください"
                  className="w-full resize-y rounded-xl border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </section>

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-40"
          >
            {saved ? "✅ 保存しました" : saving ? "保存中…" : "💾 保存する"}
          </button>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}
