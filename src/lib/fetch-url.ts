// イベントページの URL からテキスト情報を取得・抽出する（サーバー側）。
// HTTP 取得のみ＝鍵も課金も不要。SSRF 対策（http(s)以外と内部アドレスの遮断）は url-safety に集約。

import { checkPublicUrl } from "./url-safety";

function pick(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

export async function fetchEventSource(url: string): Promise<string> {
  const check = checkPublicUrl(url);
  if (!check.ok) throw new Error(check.error);
  const u = check.url;

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
