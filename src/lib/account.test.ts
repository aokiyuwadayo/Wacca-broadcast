import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAccountId, accountFields } from "./account";

// Supabase 未設定（env なし）のローカル環境を再現する
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAccountId", () => {
  it("env 未設定なら null（従来のシングルテナント挙動に倒れる）", async () => {
    expect(await getAccountId()).toBeNull();
  });
});

describe("accountFields", () => {
  it("null なら何も足さない", () => {
    expect(accountFields(null)).toEqual({});
  });
  it("account_id があれば付与する", () => {
    expect(accountFields("abc-123")).toEqual({ account_id: "abc-123" });
  });
});
