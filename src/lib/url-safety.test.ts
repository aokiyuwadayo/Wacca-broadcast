import { describe, it, expect } from "vitest";
import { checkPublicUrl } from "./url-safety";

describe("checkPublicUrl", () => {
  it("通常の https URL は通す", () => {
    const r = checkPublicUrl("https://discord.com/api/webhooks/123/abc");
    expect(r.ok).toBe(true);
  });

  it("http も既定では通す（ページ取得用）", () => {
    expect(checkPublicUrl("http://example.com").ok).toBe(true);
  });

  it("requireHttps では http を弾く", () => {
    const r = checkPublicUrl("http://example.com", { requireHttps: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("https");
  });

  it("http(s) 以外のスキームを弾く", () => {
    expect(checkPublicUrl("ftp://example.com").ok).toBe(false);
    expect(checkPublicUrl("file:///etc/passwd").ok).toBe(false);
    expect(checkPublicUrl("javascript:alert(1)").ok).toBe(false);
  });

  it("不正な文字列を弾く", () => {
    expect(checkPublicUrl("not a url").ok).toBe(false);
    expect(checkPublicUrl("").ok).toBe(false);
  });

  it("SSRF: localhost / ループバック / プライベートIP / リンクローカルを弾く", () => {
    for (const u of [
      "http://localhost/x",
      "https://127.0.0.1/x",
      "http://0.0.0.0/x",
      "https://10.0.0.5/x",
      "https://192.168.1.1/x",
      "https://169.254.169.254/latest/meta-data", // クラウドメタデータ
      "https://172.16.0.1/x",
      "https://172.31.255.255/x",
      "http://[::1]/x",
    ]) {
      expect(checkPublicUrl(u).ok, u).toBe(false);
    }
  });

  it("172.32 以降は公開扱い（プライベート範囲は 172.16-31 のみ）", () => {
    expect(checkPublicUrl("https://172.32.0.1/x").ok).toBe(true);
  });

  it("ok のとき正規化された URL を返す", () => {
    const r = checkPublicUrl("https://hooks.slack.com/services/T/B/x");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url.hostname).toBe("hooks.slack.com");
  });
});
