// 純粋なユーティリティ（テスト対象）

/** 「、」または「,」区切りの文字列を、トリム済み・空要素除去の配列にする */
export function splitList(v: string): string[] {
  return v
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
