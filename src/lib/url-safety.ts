// 外部URLへサーバから fetch する前の安全チェック（SSRF対策）。
// fetch-url（イベントページ取得）と test-webhook（接続テスト送信）で共通利用する。
// 内部・ループバック宛を弾き、スキームを制限する。

// localhost / ループバック / プライベートIP / リンクローカル を弾く
const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i;

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string };

/**
 * 公開URLとして安全か検証する。
 * @param raw 入力URL文字列
 * @param opts.requireHttps true なら https のみ許可（Webhook送信用）。false なら http(s) 両方（ページ取得用）。
 */
export function checkPublicUrl(raw: string, opts: { requireHttps?: boolean } = {}): UrlCheck {
  let url: URL;
  try {
    url = new URL(String(raw));
  } catch {
    return { ok: false, error: "URLの形式が正しくありません" };
  }
  if (opts.requireHttps) {
    if (url.protocol !== "https:") {
      return { ok: false, error: "https のURLを指定してください" };
    }
  } else if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "http(s) のURLのみ対応しています" };
  }
  if (PRIVATE_HOST.test(url.hostname)) {
    return { ok: false, error: "このURLは利用できません" };
  }
  return { ok: true, url };
}
