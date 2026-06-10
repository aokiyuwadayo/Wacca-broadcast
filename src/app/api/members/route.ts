import { NextRequest } from "next/server";
import { getServerDb } from "@/lib/supabase-server";
import { getAccountContext } from "@/lib/account";

export const runtime = "nodejs";

// メンバー管理（Issue #8 PR-4）。ログイン + membership が前提。
// 未ログイン・認証未導入の環境では 401 を返し、設定画面はセクション自体を出さない。

export async function GET() {
  const ctx = await getAccountContext();
  if (!ctx) return Response.json({ error: "ログインが必要です" }, { status: 401 });

  try {
    const db = getServerDb();
    const { data: rows, error } = await db
      .from("memberships")
      .select("id, user_id, role, created_at")
      .eq("account_id", ctx.accountId)
      .order("created_at");
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // email は auth.users から引く（service_role の admin API）
    const members = await Promise.all(
      (rows ?? []).map(async (m) => {
        const { data } = await db.auth.admin.getUserById(m.user_id);
        return { ...m, email: data?.user?.email ?? "(不明)" };
      }),
    );
    return Response.json({ members, me: { user_id: ctx.userId, role: ctx.role } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "メンバー一覧の取得に失敗しました" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAccountContext();
  if (!ctx) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  if (ctx.role !== "owner") {
    return Response.json({ error: "メンバーの招待は owner のみ可能です" }, { status: 403 });
  }

  try {
    const { email } = await req.json();
    const trimmed = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!trimmed || !trimmed.includes("@")) {
      return Response.json({ error: "メールアドレスを入力してください" }, { status: 400 });
    }

    const db = getServerDb();

    // 既存ユーザーならその id を、未登録なら招待メールを送って作成
    let userId: string | null = null;
    const invited = await db.auth.admin.inviteUserByEmail(trimmed);
    if (invited.data?.user) {
      userId = invited.data.user.id;
    } else {
      // 既に登録済み等で招待が失敗した場合は一覧から探す
      const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = list?.users?.find((u) => u.email?.toLowerCase() === trimmed)?.id ?? null;
    }
    if (!userId) {
      return Response.json(
        { error: `招待に失敗しました: ${invited.error?.message ?? "ユーザーを特定できません"}` },
        { status: 500 },
      );
    }

    const { data, error } = await db
      .from("memberships")
      .insert({ account_id: ctx.accountId, user_id: userId, role: "admin" })
      .select()
      .single();
    if (error) {
      const friendly = error.code === "23505" ? "既にメンバーです" : error.message;
      return Response.json({ error: friendly }, { status: 400 });
    }
    return Response.json({ ...data, email: trimmed });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "招待に失敗しました" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAccountContext();
  if (!ctx) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  if (ctx.role !== "owner") {
    return Response.json({ error: "メンバーの削除は owner のみ可能です" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    const db = getServerDb();

    // 同じサークルのメンバーであること・owner でないことを確認（owner は移譲でのみ交代）
    const { data: target } = await db
      .from("memberships")
      .select("id, role")
      .eq("id", id)
      .eq("account_id", ctx.accountId)
      .maybeSingle();
    if (!target) return Response.json({ error: "メンバーが見つかりません" }, { status: 404 });
    if (target.role === "owner") {
      return Response.json(
        { error: "owner は削除できません（先に owner を移譲してください）" },
        { status: 400 },
      );
    }

    const { error } = await db.from("memberships").delete().eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "削除に失敗しました" },
      { status: 500 },
    );
  }
}
