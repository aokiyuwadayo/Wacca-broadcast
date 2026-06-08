import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createRouteClient } from "@/lib/supabase-ssr";

// マジックリンクのコールバック。メール内リンクの ?token_hash=&type= を verifyOtp で確定し、
// セッション Cookie を確立して next（既定 "/"）へ。
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (token_hash && type) {
    const supabase = await createRouteClient();
    if (!supabase) return redirectTo("/login");
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return redirectTo(next);
  }
  return redirectTo("/login");
}
