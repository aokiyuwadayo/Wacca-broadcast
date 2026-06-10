import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PUT, DELETE } from "./route";

// Supabase 未設定（env なし）のローカル環境を再現する
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function jsonRequest(method: string, body: unknown) {
  return new NextRequest("http://localhost/api/regular-schedules", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/regular-schedules（Supabase 未設定）", () => {
  it("空配列を 200 で返す（loading 固着の再発防止）", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("書き込み系 /api/regular-schedules（Supabase 未設定）", () => {
  it("POST は JSON のエラーを 500 で返す", async () => {
    const res = await POST(jsonRequest("POST", { day_of_week: 4 }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Supabase");
  });

  it("PUT は JSON のエラーを 500 で返す", async () => {
    const res = await PUT(jsonRequest("PUT", { id: "x", day_of_week: 4 }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Supabase");
  });

  it("DELETE は JSON のエラーを 500 で返す", async () => {
    const res = await DELETE(jsonRequest("DELETE", { id: "x" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Supabase");
  });
});
