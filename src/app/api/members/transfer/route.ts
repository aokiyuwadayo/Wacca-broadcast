import { NextRequest } from "next/server";
import { getServerDb } from "@/lib/supabase-server";
import { getAccountContext } from "@/lib/account";

export const runtime = "nodejs";

// owner 移譲（Issue #8 PR-4）。引き継ぎの本体: accounts.owner_user_id の付け替え。
// 「先に新 owner へ昇格 → account の owner 付け替え → 旧 owner を降格」の順で、
// どの時点で失敗しても owner が 0 人にならないようにする。

export async function POST(req: NextRequest) {
  const ctx = await getAccountContext();
  if (!ctx) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  if (ctx.role !== "owner") {
    return Response.json({ error: "owner の移譲は現 owner のみ可能です" }, { status: 403 });
  }

  try {
    const { user_id: newOwnerId } = await req.json();
    if (!newOwnerId || newOwnerId === ctx.userId) {
      return Response.json({ error: "移譲先のメンバーを指定してください" }, { status: 400 });
    }

    const db = getServerDb();
    const { data: target } = await db
      .from("memberships")
      .select("id")
      .eq("account_id", ctx.accountId)
      .eq("user_id", newOwnerId)
      .maybeSingle();
    if (!target) {
      return Response.json({ error: "移譲先がこのサークルのメンバーではありません" }, { status: 400 });
    }

    // 1) 新 owner を昇格
    const promote = await db
      .from("memberships")
      .update({ role: "owner" })
      .eq("id", target.id);
    if (promote.error) return Response.json({ error: promote.error.message }, { status: 500 });

    // 2) account の owner を付け替え
    const reassign = await db
      .from("accounts")
      .update({ owner_user_id: newOwnerId })
      .eq("id", ctx.accountId);
    if (reassign.error) return Response.json({ error: reassign.error.message }, { status: 500 });

    // 3) 旧 owner を admin へ
    const demote = await db
      .from("memberships")
      .update({ role: "admin" })
      .eq("account_id", ctx.accountId)
      .eq("user_id", ctx.userId);
    if (demote.error) return Response.json({ error: demote.error.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "owner の移譲に失敗しました" },
      { status: 500 },
    );
  }
}
