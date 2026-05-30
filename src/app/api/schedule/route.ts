import { NextRequest } from "next/server";
import { getServerDb } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const { data } = await getServerDb()
    .from("scheduled_posts")
    .select("*")
    .order("scheduled_date", { ascending: true });
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
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
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await getServerDb().from("scheduled_posts").delete().eq("id", id);
  return Response.json({ ok: true });
}
