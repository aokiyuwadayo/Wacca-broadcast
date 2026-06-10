import { NextRequest } from "next/server";
import { getServerDb, getServerDbOrNull } from "@/lib/supabase-server";
import { getAccountId, accountFields } from "@/lib/account";

export const runtime = "nodejs";

export async function GET() {
  const db = getServerDbOrNull();
  if (!db) return Response.json([]);

  const accountId = await getAccountId();
  let query = db.from("regular_schedules").select("*");
  if (accountId) query = query.eq("account_id", accountId);

  const { data, error } = await query.order("day_of_week");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accountId = await getAccountId();
    const { data, error } = await getServerDb()
      .from("regular_schedules")
      .insert({ ...body, ...accountFields(accountId) })
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "定期スケジュールの保存に失敗しました" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...rest } = await req.json();
    const accountId = await getAccountId();
    let query = getServerDb().from("regular_schedules").update(rest).eq("id", id);
    if (accountId) query = query.eq("account_id", accountId); // 他サークルの行を ID 直指定で触らせない
    const { error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "定期スケジュールの更新に失敗しました" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const accountId = await getAccountId();
    let query = getServerDb().from("regular_schedules").delete().eq("id", id);
    if (accountId) query = query.eq("account_id", accountId);
    const { error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "定期スケジュールの削除に失敗しました" },
      { status: 500 },
    );
  }
}
