import { getServerDbOrNull } from "@/lib/supabase-server";

export const runtime = "nodejs";

// 履歴の取得をサーバ側へ寄せる（従来はクライアントの anon キーで broadcasts を直読みしていた）。
// 狙い: 将来 RLS を有効化したとき、anon 直読みだと SELECT が拒否され /history が壊れる問題を先に解消する。
// service_role で読むため RLS の影響を受けない（認証導入後は account_id で絞る予定。phase-e-auth-plan.md）。
export async function GET() {
  const db = getServerDbOrNull();
  if (!db) return Response.json([]); // Supabase 未設定なら空（従来も未設定なら空表示）
  const { data } = await db
    .from("broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return Response.json(data ?? []);
}
