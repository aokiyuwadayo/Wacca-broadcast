import { getServerDbOrNull } from "@/lib/supabase-server";
import { getAccountId } from "@/lib/account";

export const runtime = "nodejs";

// 履歴の取得をサーバ側へ寄せる（従来はクライアントの anon キーで broadcasts を直読みしていた）。
// 狙い: 将来 RLS を有効化したとき、anon 直読みだと SELECT が拒否され /history が壊れる問題を先に解消する。
// service_role で読むため RLS の影響を受けない。ログイン中は自分のサークルの履歴だけに絞る。
export async function GET() {
  const db = getServerDbOrNull();
  if (!db) return Response.json([]); // Supabase 未設定なら空（従来も未設定なら空表示）

  const accountId = await getAccountId();
  let query = db.from("broadcasts").select("*");
  if (accountId) query = query.eq("account_id", accountId);

  const { data } = await query.order("created_at", { ascending: false }).limit(50);
  return Response.json(data ?? []);
}
