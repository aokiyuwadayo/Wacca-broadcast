import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function db() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    `https://zgptvigkdcndcmszjocz.supabase.co`;
  const supabaseUrl = url.startsWith("http") ? url.replace(/\/$/, "") : `https://${url.replace(/\/$/, "")}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(supabaseUrl, key);
}

export async function GET() {
  const { data } = await db().from("settings").select("*").limit(1).maybeSingle();
  return Response.json(data ?? {});
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await db()
    .from("settings")
    .upsert({ id: body.id ?? undefined, ...body, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
