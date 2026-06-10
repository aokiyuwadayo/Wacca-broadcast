import { createRouteClient } from "@/lib/supabase-ssr";
import { getServerDbOrNull } from "@/lib/supabase-server";

// Issue #8 PR-2/PR-4: ログイン中ユーザーのサークル（account）コンテキストを解決する。
//
// 段階導入の要: 解決できないケース（未ログイン / REQUIRE_AUTH オフ / env 未設定 /
// memberships 未登録 / route handler 外からの呼び出し）はすべて null を返し、
// 呼び出し側は従来のシングルテナント挙動（絞り込みなし・付与なし）にフォールバックする。
// → 認証を有効化していない既存環境の動作を一切変えない。

export type AccountContext = {
  userId: string;
  accountId: string;
  role: "owner" | "admin";
};

export async function getAccountContext(): Promise<AccountContext | null> {
  try {
    const auth = await createRouteClient();
    if (!auth) return null;
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return null;

    const db = getServerDbOrNull();
    if (!db) return null;
    const { data } = await db
      .from("memberships")
      .select("account_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!data?.account_id) return null;
    return { userId: user.id, accountId: data.account_id, role: data.role };
  } catch {
    return null;
  }
}

export async function getAccountId(): Promise<string | null> {
  return (await getAccountContext())?.accountId ?? null;
}

/** insert/upsert に混ぜる account_id フィールド（未解決なら何も足さない） */
export function accountFields(accountId: string | null): { account_id?: string } {
  return accountId ? { account_id: accountId } : {};
}
