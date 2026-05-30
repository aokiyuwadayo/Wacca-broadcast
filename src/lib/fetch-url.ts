// イベントページの URL からテキスト情報を取得・抽出する（サーバー側）。
// HTTP 取得のみ＝鍵も課金も不要。SSRF 対策として http(s) 以外と内部アドレスを弾く。

const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i;

function pick(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

export async function fetchEventSource(url: string): Promise<string> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("URLの形式が正しくありません");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("http(s) のURLのみ対応しています");
  }
  if (PRIVATE_HOST.test(u.hostname)) {
    throw new Error("このURLは取得できません");
  }

  let res: Response;
  try {
    res = await fetch(u.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WaccaCast/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("ページの取得に失敗しました（時間切れ・到達不可など）");
  }
  if (!res.ok) throw new Error(`ページ取得に失敗しました (HTTP ${res.status})`);

  const html = (await res.text()).slice(0, 400_000);

  const title =
    pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc =
    pick(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

  // schema.org の構造化データ（Event 情報が入っていることが多い）
  const jsonld: string[] = [];
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = ldRe.exec(html)) && jsonld.length < 3) {
    jsonld.push(m[1].trim().slice(0, 2000));
  }

  // 本文テキスト（タグ除去・短縮）
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  const parts = [
    `URL: ${url}`,
    title && `ページタイトル: ${title}`,
    desc && `概要(meta): ${desc}`,
    jsonld.length > 0 && `構造化データ(JSON-LD):\n${jsonld.join("\n---\n")}`,
    body && `本文抜粋: ${body}`,
  ].filter(Boolean);

  return parts.join("\n\n").slice(0, 7000);
}
