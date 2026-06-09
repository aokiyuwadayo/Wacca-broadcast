import { NextRequest } from "next/server";
import { getServerDb, getServerDbOrNull } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const db = getServerDbOrNull();
  if (!db) return Response.json({});

  const { data, error } = await db.from("settings").select("*").limit(1).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? {});
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = await getServerDb()
      .from("settings")
      .upsert({ id: body.id ?? undefined, ...body, updated_at: new Date().toISOString() })
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
