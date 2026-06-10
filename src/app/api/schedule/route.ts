import { NextRequest } from "next/server";
import { getServerDb, getServerDbOrNull } from "@/lib/supabase-server";
import { getAccountId, accountFields } from "@/lib/account";

export const runtime = "nodejs";

export async function GET() {
  const db = getServerDbOrNull();
  if (!db) return Response.json([]);

  const accountId = await getAccountId();
  let query = db.from("scheduled_posts").select("*");
  if (accountId) query = query.eq("account_id", accountId);

  const { data, error } = await query.order("scheduled_date", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, text, scheduled_date } = body;
    if (!platform || !text || !scheduled_date) {
      return Response.json({ error: "platform / text / scheduled_date は必須" }, { status: 400 });
    }
    const accountId = await getAccountId();
    const { data, error } = await getServerDb()
      .from("scheduled_posts")
      .insert({ platform, text, scheduled_date, ...accountFields(accountId) })
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "予約投稿の保存に失敗しました" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const accountId = await getAccountId();
    let query = getServerDb().from("scheduled_posts").delete().eq("id", id);
    if (accountId) query = query.eq("account_id", accountId);
    const { error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "予約投稿の削除に失敗しました" },
      { status: 500 },
    );
  }
}
