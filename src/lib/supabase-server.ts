import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// サーバー側 Supabase クライアントの単一の入口。
// 以前は各 API ルートが個別に createClient していて、URL 正規化とハードコードされた
// プロジェクト参照（fallback）が 5 箇所に重複していた。ここに集約し、
// **本番プロジェクト URL の直書きを撤去**して env 必須にする（設定漏れを silent に
// 別プロジェクトへ書き込む事故を防ぎ、未設定なら明示エラーで気付けるようにする）。

/** env から URL を解決して正規化（http:// 補完・末尾スラッシュ除去）。未設定なら null。 */
function resolveUrl(): string | null {
  const raw = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!raw) return null;
  const noSlash = raw.replace(/\/$/, "");
  return noSlash.startsWith("http") ? noSlash : `https://${noSlash}`;
}

/**
 * env（URL + service_role キー）が揃っていれば server client、無ければ null。
 * 「Supabase が無くても動く」用途（保存・履歴・文体学習の取得など、欠けても本処理は続ける）向け。
 */
export function getServerDbOrNull(): SupabaseClient | null {
  const url = resolveUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Supabase が必須の用途向け。未設定なら明示エラーで落とす（empty key で createClient して
 * クエリが静かに失敗する、という silent fail を防ぐ）。
 */
export function getServerDb(): SupabaseClient {
  const db = getServerDbOrNull();
  if (!db) {
    throw new Error(
      "Supabase が未設定です。SUPABASE_URL（または NEXT_PUBLIC_SUPABASE_URL）と SUPABASE_SERVICE_ROLE_KEY を設定してください。",
    );
  }
  return db;
}
