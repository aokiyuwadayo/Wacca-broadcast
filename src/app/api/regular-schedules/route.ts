import { NextRequest } from "next/server";
import { getServerDb, getServerDbOrNull } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const db = getServerDbOrNull();
  if (!db) return Response.json([]);

  const { data, error } = await db
    .from("regular_schedules")
    .select("*")
    .order("day_of_week");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = await getServerDb()
      .from("regular_schedules")
      .insert(body)
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
    const { error } = await getServerDb()
      .from("regular_schedules")
      .update(rest)
      .eq("id", id);
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
    const { error } = await getServerDb().from("regular_schedules").delete().eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "定期スケジュールの削除に失敗しました" },
      { status: 500 },
    );
  }
}
