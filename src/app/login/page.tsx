"use client";

import { useState } from "react";
import { createClientBrowser } from "@/lib/supabase-browser";

// マジックリンク（メールOTP）ログイン。Issue #8 の認証段階導入。
// 有効化は env REQUIRE_AUTH=1（既定オフ）。Supabase 側で Email Auth を有効化し、
// 許可するメールを絞る運用は個人PCで（docs/phase-e-auth-plan.md）。
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClientBrowser();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase が未設定です（NEXT_PUBLIC_SUPABASE_URL / ANON_KEY）。");
      return;
    }
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("ログインリンクをメールに送りました。メール内のリンクを開いてください。");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="mb-1 text-xl font-bold text-slate-800">Wacca Cast にログイン</h1>
        <p className="mb-5 text-sm text-slate-500">メールにログインリンクを送ります（パスワード不要）。</p>
        <form onSubmit={sendLink} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            disabled={status === "sending" || !email.trim()}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-40"
          >
            {status === "sending" ? "送信中…" : "ログインリンクを送る"}
          </button>
        </form>
        {message && (
          <p className={`mt-4 text-sm ${status === "error" ? "text-red-600" : "text-emerald-600"}`}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
