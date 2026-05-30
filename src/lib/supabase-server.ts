import { createClient } from "@supabase/supabase-js";

export function getServerDb() {
  const rawUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = rawUrl.startsWith("http")
    ? rawUrl.replace(/\/$/, "")
    : rawUrl
      ? `https://${rawUrl.replace(/\/$/, "")}`
      : `https://zgptvigkdcndcmszjocz.supabase.co`;
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
}
