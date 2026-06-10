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
  slack_announce_webhook: string;
  style_memo: string;
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
  slack_announce_webhook: "",
  style_memo: "",
};

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

type Member = { id: string; user_id: string; role: "owner" | "admin"; email: string };

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>(EMPTY);
  const [schedules, setSchedules] = useState<RegularSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 接続テスト：送信中のPFと、PFごとの結果（届くまで「接続済み」にしない＝silent fail防止）
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  // メンバー管理（Issue #8 PR-4）。null = 未ログイン等でセクション非表示
  const [members, setMembers] = useState<Member[] | null>(null);
  const [myRole, setMyRole] = useState<"owner" | "admin" | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberMsg, setMemberMsg] = useState<string | null>(null);
  const [memberBusy, setMemberBusy] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, schedulesRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/regular-schedules"),
        ]);
        const settingsData = await settingsRes.json();
        const schedulesData = await schedulesRes.json();
        if (!settingsRes.ok) throw new Error(settingsData.error ?? "設定を読み込めませんでした");
        if (!schedulesRes.ok) throw new Error(schedulesData.error ?? "定期スケジュールを読み込めませんでした");
        // DB に新カラムが無い間も入力が undefined にならないよう EMPTY とマージ
        if (settingsData?.circle_name !== undefined) setForm({ ...EMPTY, ...settingsData });
        if (Array.isArray(schedulesData)) setSchedules(schedulesData);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "設定の読み込みに失敗しました");
      } finally {
        setLoading(false);
      }

      // メンバー一覧はログイン中のみ取得できる（401 = セクション非表示の合図なので無視）
      try {
        const res = await fetch("/api/members");
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members ?? []);
          setMyRole(data.me?.role ?? null);
          setMyUserId(data.me?.user_id ?? null);
        }
      } catch {
        // 非表示のまま
      }
    }

    load();
  }, []);

  async function reloadMembers() {
    const res = await fetch("/api/members");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members ?? []);
      setMyRole(data.me?.role ?? null);
    }
  }

  async function inviteMember() {
    setMemberBusy(true);
    setMemberMsg(null);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "招待に失敗しました");
      setInviteEmail("");
      setMemberMsg("✅ 招待しました（相手に招待メールが届きます）");
      await reloadMembers();
    } catch (error) {
      setMemberMsg(`❌ ${error instanceof Error ? error.message : "招待に失敗しました"}`);
    } finally {
      setMemberBusy(false);
    }
  }

  async function removeMember(m: Member) {
    if (!confirm(`${m.email} をメンバーから削除しますか？`)) return;
    setMemberBusy(true);
    setMemberMsg(null);
    try {
      const res = await fetch("/api/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "削除に失敗しました");
      await reloadMembers();
    } catch (error) {
      setMemberMsg(`❌ ${error instanceof Error ? error.message : "削除に失敗しました"}`);
    } finally {
      setMemberBusy(false);
    }
  }

  async function transferOwner(m: Member) {
    if (!confirm(`owner（引き継ぎ先）を ${m.email} に移譲しますか？\nあなたは admin になります。`)) return;
    setMemberBusy(true);
    setMemberMsg(null);
    try {
      const res = await fetch("/api/members/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: m.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "移譲に失敗しました");
      setMemberMsg(`✅ owner を ${m.email} に移譲しました`);
      await reloadMembers();
    } catch (error) {
      setMemberMsg(`❌ ${error instanceof Error ? error.message : "移譲に失敗しました"}`);
    } finally {
      setMemberBusy(false);
    }
  }

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

  // 「保存しました」は API が成功を返したときだけ出す（silent fail 防止）
  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "設定を保存できませんでした");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof Settings) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // 入力中の Webhook URL に実際にテスト1通を送る（保存と独立）。
  // resultKey は結果表示のキー（Slack はリマインド用と告知用で2欄あるため platform と分離）
  async function testWebhook(platform: "discord" | "teams" | "slack", url: string, resultKey = platform as string) {
    if (!url.trim()) {
      setTestResult((r) => ({ ...r, [resultKey]: { ok: false, msg: "URL を入力してください" } }));
      return;
    }
    setTesting(resultKey);
    setTestResult((r) => ({ ...r, [resultKey]: { ok: false, msg: "送信中…" } }));
    try {
      const res = await fetch("/api/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url }),
      });
      const data = await res.json();
      setTestResult((r) => ({
        ...r,
        [resultKey]: res.ok
          ? { ok: true, msg: "✅ 届きました（接続OK）。実際の通知を確認してください" }
          : { ok: false, msg: `❌ ${data.error ?? "失敗しました"}` },
      }));
    } catch {
      setTestResult((r) => ({ ...r, [resultKey]: { ok: false, msg: "❌ 通信に失敗しました" } }));
    } finally {
      setTesting(null);
    }
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
        <h1 className="text-xl font-bold text-slate-800">⚙️ 設定</h1>
      </header>

      {loading ? (
        <p className="text-center text-sm text-slate-400">読み込み中…</p>
      ) : (
        <div className="space-y-5">
          {loadError && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
              {loadError}
            </div>
          )}
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
              <br />
              入力したら「テスト送信」で実際に1通届くか確認を（届かない設定で“接続済み”と思い込む事故を防ぎます）。
            </p>
            <div className="space-y-4">
              <div>
                <Field
                  label="Discord Webhook URL"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={form.discord_webhook}
                  onChange={set("discord_webhook")}
                />
                <TestRow
                  platform="discord"
                  url={form.discord_webhook}
                  testing={testing}
                  result={testResult.discord}
                  onTest={testWebhook}
                />
              </div>
              <div>
                <Field
                  label="Slack Webhook URL（告知投稿用）"
                  placeholder="https://hooks.slack.com/services/...（例：#00_announce 向け）"
                  value={form.slack_announce_webhook}
                  onChange={set("slack_announce_webhook")}
                />
                <TestRow
                  platform="slack"
                  resultKey="slack_announce"
                  url={form.slack_announce_webhook}
                  testing={testing}
                  result={testResult.slack_announce}
                  onTest={testWebhook}
                />
              </div>
              <div>
                <Field
                  label="Slack Webhook URL（リマインド通知用）"
                  placeholder="https://hooks.slack.com/services/...（例：#100_notifications 向け）"
                  value={form.slack_webhook}
                  onChange={set("slack_webhook")}
                />
                <TestRow
                  platform="slack"
                  url={form.slack_webhook}
                  testing={testing}
                  result={testResult.slack}
                  onTest={testWebhook}
                />
              </div>
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
                <TestRow
                  platform="teams"
                  url={form.teams_webhook}
                  testing={testing}
                  result={testResult.teams}
                  onTest={testWebhook}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">✍️ 文体・トーンの設定</h2>
            <p className="mb-3 text-xs text-slate-400">
              AI がこの指示と過去の告知文（最新5件）を参考にして、あなたらしい文体で生成します。
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-500">文体・トーンの要望</label>
              <textarea
                rows={3}
                value={form.style_memo}
                onChange={(e) => setForm((f) => ({ ...f, style_memo: e.target.value }))}
                placeholder="例：絵文字多め、フランクに、「〜だよ！」系のノリで。締めは必ず「気軽に来てね〜」"
                className="mt-1 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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

          {members !== null && (
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">👥 メンバー</h2>
              <p className="mb-3 text-xs text-slate-400">
                このサークルを管理できる人。owner は招待・削除と、代替わり時の owner 移譲ができます。
              </p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"
                  >
                    <div className="text-sm text-slate-700">
                      {m.email}
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        {m.role}
                      </span>
                      {m.user_id === myUserId && (
                        <span className="ml-1 text-xs text-slate-400">(自分)</span>
                      )}
                    </div>
                    {myRole === "owner" && m.user_id !== myUserId && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => transferOwner(m)}
                          disabled={memberBusy}
                          className="text-xs text-brand hover:underline disabled:opacity-40"
                        >
                          owner 移譲
                        </button>
                        {m.role !== "owner" && (
                          <button
                            onClick={() => removeMember(m)}
                            disabled={memberBusy}
                            className="text-xs text-red-500 hover:underline disabled:opacity-40"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {myRole === "owner" && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="招待するメールアドレス"
                    className="flex-1 rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  <button
                    onClick={inviteMember}
                    disabled={memberBusy || !inviteEmail.trim()}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
                  >
                    招待
                  </button>
                </div>
              )}
              {memberMsg && <p className="mt-2 text-xs text-slate-600">{memberMsg}</p>}
            </section>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-40"
          >
            {saved ? "✅ 保存しました" : saving ? "保存中…" : "💾 保存する"}
          </button>
          {saveError && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
              {saveError}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function TestRow({
  platform,
  url,
  testing,
  result,
  onTest,
  resultKey,
}: {
  platform: "discord" | "teams" | "slack";
  url: string;
  testing: string | null;
  result?: { ok: boolean; msg: string };
  onTest: (platform: "discord" | "teams" | "slack", url: string, resultKey?: string) => void;
  resultKey?: string;
}) {
  const key = resultKey ?? platform;
  const busy = testing === key;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onTest(platform, url, key)}
        disabled={busy || !url.trim()}
        className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
      >
        {busy ? "送信中…" : "テスト送信"}
      </button>
      {result && (
        <span className={`text-xs ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
          {result.msg}
        </span>
      )}
    </div>
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
