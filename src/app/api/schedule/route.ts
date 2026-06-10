import { NextRequest } from "next/server";
import { getServerDb, getServerDbOrNull } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const db = getServerDbOrNull();
  if (!db) return Response.json([]);

  const { data, error } = await db
    .from("scheduled_posts")
    .select("*")
    .order("scheduled_date", { ascending: true });
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
    const { data, error } = await getServerDb()
      .from("scheduled_posts")
      .insert({ platform, text, scheduled_date })
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
    const { error } = await getServerDb().from("scheduled_posts").delete().eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "予約投稿の削除に失敗しました" },
      { status: 500 },
    );
  }
}
