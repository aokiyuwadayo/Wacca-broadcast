import { NextRequest } from "next/server";
import { getServerDb, getServerDbOrNull } from "@/lib/supabase-server";
import { getAccountId, accountFields } from "@/lib/account";

export const runtime = "nodejs";

export async function GET() {
  const db = getServerDbOrNull();
  if (!db) return Response.json({});

  // ログイン中なら自分のサークルの設定だけを見る（未ログインなら従来どおり先頭1件）
  const accountId = await getAccountId();
  let query = db.from("settings").select("*");
  if (accountId) query = query.eq("account_id", accountId);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? {});
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accountId = await getAccountId();
    const { data, error } = await getServerDb()
      .from("settings")
      .upsert({
        id: body.id ?? undefined,
        ...body,
        ...accountFields(accountId),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "設定の保存に失敗しました" },
      { status: 500 },
    );
  }
}
