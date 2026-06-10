import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

// Supabase 未設定（env なし）のローカル環境を再現する
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/settings（Supabase 未設定）", () => {
  it("空の設定を 200 で返す（loading 固着の再発防止）", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });
});

describe("POST /api/settings（Supabase 未設定）", () => {
  it("JSON のエラーを 500 で返す", async () => {
    const req = new NextRequest("http://localhost/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circle_name: "起業部" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Supabase");
  });
});
