import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";

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
  return new NextRequest("http://localhost/api/schedule", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/schedule（Supabase 未設定）", () => {
  it("空配列を 200 で返す", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/schedule", () => {
  it("必須項目が欠けていれば 400（env より先に検証）", async () => {
    const res = await POST(jsonRequest("POST", { platform: "line" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("必須");
  });

  it("Supabase 未設定なら JSON のエラーを 500 で返す", async () => {
    const res = await POST(
      jsonRequest("POST", { platform: "line", text: "test", scheduled_date: "2026-06-11" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Supabase");
  });
});

describe("DELETE /api/schedule（Supabase 未設定）", () => {
  it("JSON のエラーを 500 で返す", async () => {
    const res = await DELETE(jsonRequest("DELETE", { id: "x" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Supabase");
  });
});
