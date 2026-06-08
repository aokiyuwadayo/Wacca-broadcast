import { NextRequest } from "next/server";
import { getServerDb } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const { data } = await getServerDb().from("settings").select("*").limit(1).maybeSingle();
  return Response.json(data ?? {});
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await getServerDb()
    .from("settings")
    .upsert({ id: body.id ?? undefined, ...body, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
