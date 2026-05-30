import { NextRequest } from "next/server";
import { getServerDb } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const { data } = await getServerDb()
    .from("regular_schedules")
    .select("*")
    .order("day_of_week");
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await getServerDb()
    .from("regular_schedules")
    .insert(body)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const { error } = await getServerDb()
    .from("regular_schedules")
    .update(rest)
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await getServerDb().from("regular_schedules").delete().eq("id", id);
  return Response.json({ ok: true });
}
