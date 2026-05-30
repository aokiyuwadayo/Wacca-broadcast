"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  id?: string;
  circle_name: string;
  leader_name: string;
  def_location: string;
  note: string;
  discord_webhook: string;
  teams_webhook: string;
  slack_webhook: string;
};

type RegularSchedule = {
  id?: string;
  day_of_week: number;
  time_str: string;
  location: string;
  summary_template: string;
  remind_days_before: number;
  active: boolean;
};

const EMPTY: Settings = {
  circle_name: "",
  leader_name: "",
  def_location: "",
  note: "",
  discord_webhook: "",
  teams_webhook: "",
  slack_webhook: "",
};

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>(EMPTY);
  const [schedules, setSchedules] = useState<RegularSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/regular-schedules").then((r) => r.json()),
    ]).then(([settingsData, schedulesData]) => {
      if (settingsData?.circle_name !== undefined) setForm(settingsData);
      if (Array.isArray(schedulesData)) setSchedules(schedulesData);
      setLoading(false);
    });
  }, []);

  async function addSchedule() {
    const res = await fetch("/api/regular-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_of_week: 4, time_str: "16:30", location: form.def_location,
        summary_template: "", remind_days_before: 2, active: true,
      }),
    });
    const data = await res.json();
    setSchedules((s) => [...s, data]);
  }

  async function updateSchedule(idx: number, patch: Partial<RegularSchedule>) {
    const updated = { ...schedules[idx], ...patch };
    setSchedules((s) => s.map((x, i) => (i === idx ? updated : x)));
    if (updated.id) {
      await fetch("/api/regular-schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    }
  }

  async function deleteSchedule(idx: number) {
    const s = schedules[idx];
    if (s.id) await fetch("/api/regular-schedules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id }),
    });
    setSchedules((prev) => prev.filter((_, i) => i !== idx));
  }

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
            <h2 className="mb-4 text-sm font-semibold text-slate-700">自動投稿の接続先</h2>
            <p className="mb-3 text-xs text-slate-400">
              設定すると生成後に「送信」ボタンが出ます。送信前に必ず確認ダイアログが出ます。
            </p>
            <div className="space-y-3">
              <Field
                label="Discord Webhook URL"
                placeholder="https://discord.com/api/webhooks/..."
                value={form.discord_webhook}
                onChange={set("discord_webhook")}
              />
              <Field
                label="Slack Webhook URL（リマインド通知用）"
                placeholder="https://hooks.slack.com/services/..."
                value={form.slack_webhook}
                onChange={set("slack_webhook")}
              />
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Teams Workflow URL
                  <span className="ml-1 font-normal text-slate-400">
                    （Power Automate → Instant cloud flow → HTTP request）
                  </span>
                </label>
                <input
                  value={form.teams_webhook}
                  onChange={(e) => set("teams_webhook")(e.target.value)}
                  placeholder="https://prod-xx.westus.logic.azure.com/..."
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
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

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">🗓 定期スケジュール</h2>
              <button
                onClick={addSchedule}
                className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
              >
                + 追加
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              設定した日の「remind_days_before」日前の朝8時に、Slack へ下書きと通知が届きます。
            </p>
            {schedules.length === 0 && (
              <p className="text-xs text-slate-400">まだ登録されていません。「+ 追加」で作成できます。</p>
            )}
            <div className="space-y-3">
              {schedules.map((s, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500">曜日</label>
                      <select
                        value={s.day_of_week}
                        onChange={(e) => updateSchedule(i, { day_of_week: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                      >
                        {DAY_NAMES.map((d, v) => <option key={v} value={v}>{d}曜日</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500">時刻</label>
                      <input
                        value={s.time_str}
                        onChange={(e) => updateSchedule(i, { time_str: e.target.value })}
                        placeholder="16:30"
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500">場所</label>
                      <input
                        value={s.location}
                        onChange={(e) => updateSchedule(i, { location: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500">N日前に通知</label>
                      <input
                        type="number"
                        min={1}
                        max={7}
                        value={s.remind_days_before}
                        onChange={(e) => updateSchedule(i, { remind_days_before: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-slate-500">内容テンプレ（省略可）</label>
                    <input
                      value={s.summary_template}
                      onChange={(e) => updateSchedule(i, { summary_template: e.target.value })}
                      placeholder="例：今週の活動報告と次回の計画"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={s.active}
                        onChange={(e) => updateSchedule(i, { active: e.target.checked })}
                      />
                      有効
                    </label>
                    <button
                      onClick={() => deleteSchedule(i)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
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
