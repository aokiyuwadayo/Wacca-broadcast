import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "broadcast-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXT = ["jpg", "jpeg", "png", "gif", "webp"];

function getDb() {
  const rawUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = rawUrl.startsWith("http")
    ? rawUrl.replace(/\/$/, "")
    : rawUrl
    ? `https://${rawUrl.replace(/\/$/, "")}`
    : `https://zgptvigkdcndcmszjocz.supabase.co`;
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "Supabase が未設定です" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "ファイルが見つかりません" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "5MB 以下のファイルを選んでください" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) {
    return Response.json({ error: "jpg / png / gif / webp のみ対応しています" }, { status: 400 });
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = await file.arrayBuffer();

  const db = getDb();
  const { error } = await db.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (error) return Response.json({ error: `アップロード失敗: ${error.message}` }, { status: 500 });

  const { data } = db.storage.from(BUCKET).getPublicUrl(fileName);
  return Response.json({ url: data.publicUrl });
}
