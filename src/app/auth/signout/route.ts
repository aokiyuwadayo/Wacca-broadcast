import { type NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-ssr";

// ログアウト。セッションを破棄して /login へ。
export async function POST(request: NextRequest) {
  const supabase = await createRouteClient();
  if (supabase) await supabase.auth.signOut();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
