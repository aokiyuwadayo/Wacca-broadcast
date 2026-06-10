import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";
import { POST as TRANSFER } from "./transfer/route";

// 認証未導入・未ログイン環境を再現（env なし → getAccountContext は null）
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function jsonRequest(method: string, body: unknown) {
  return new NextRequest("http://localhost/api/members", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("メンバー管理 API（未ログイン）", () => {
  it("GET は 401（設定画面はセクション非表示にする）", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST（招待）は 401", async () => {
    const res = await POST(jsonRequest("POST", { email: "x@example.com" }));
    expect(res.status).toBe(401);
  });

  it("DELETE は 401", async () => {
    const res = await DELETE(jsonRequest("DELETE", { id: "x" }));
    expect(res.status).toBe(401);
  });

  it("owner 移譲は 401", async () => {
    const res = await TRANSFER(jsonRequest("POST", { user_id: "x" }));
    expect(res.status).toBe(401);
  });
});
