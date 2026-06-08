// 純粋なユーティリティ（テスト対象）

import type { BroadcastJson, BroadcastKind } from "./schema";

/** 「、」または「,」区切りの文字列を、トリム済み・空要素除去の配列にする */
export function splitList(v: string): string[] {
  return v
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 設定/入力フォームの各項目（すべて文字列。カンマ区切り欄は splitList で配列化する） */
export interface FormFields {
  title: string;
  start: string;
  location: string;
  summary: string;
  body: string;
  bring: string;
  hook: string;
  note: string;
  fee: string;
  guests: string;
  cta: string;
}

/**
 * フォーム入力を中間JSON(BroadcastJson)へ組み立てる純関数。
 * - カンマ/読点区切り欄(body/bring/guests)は配列化
 * - 空文字の任意項目(fee/cta)は null に正規化
 * - access/online_url/links/images はフォームに無いので空で初期化
 */
export function buildJsonFromForm(kind: BroadcastKind, form: FormFields): BroadcastJson {
  return {
    kind,
    title: form.title,
    datetime: { start: form.start, end: null },
    location: { name: form.location, access: "", online_url: "" },
    summary: form.summary,
    body: splitList(form.body),
    bring: splitList(form.bring),
    rsvp: null,
    fee: form.fee || null,
    guests: splitList(form.guests),
    cta: form.cta || null,
    hook: form.hook,
    note: form.note,
    links: [],
    images: [],
  };
}

/** スライド1枚をコピー用テキストに整形（タイトル＋「・」箇条書き） */
export function slideToText(slide: { title: string; bullets: string[] }): string {
  return `${slide.title}\n${slide.bullets.map((b) => `・${b}`).join("\n")}`;
}
