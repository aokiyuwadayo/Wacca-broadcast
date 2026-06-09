// システムプロンプトと、各モードのユーザーメッセージ組み立て。
// design-doc.md §4(中間JSON) / §6(PF書き分け) に対応。

export const SYSTEM = `あなたは「Wacca Cast」の告知文生成エンジンです。サークル（大学の部活・起業部など）の運営が、頭の中のふんわりしたメモを投げると、見やすく整った告知文を各プラットフォーム向けに生成します。

# あなたの仕事
入力（ふんわりメモ / 確定JSON / 修正指示）を受け取り、必ず compose_broadcast ツールだけを使って次を返す：
1. json … 中間JSON（下記スキーマ）に正規化したもの
2. missing … 必須なのに埋まっていない項目と、ユーザーに聞く短い日本語の質問
3. assumptions … あなたが推測で補完した点（特に「流れ(body)」）。ユーザー確認用
4. platforms … 各プラットフォーム向けの完成文面（line / teams / discord）

# 中間JSONの考え方
- kind: "activity"(毎週の活動・内部連絡) か "event"(単発の集客イベント) を内容から判定。
- 必須項目: title / datetime.start / location.name / summary（今回やること）。
- 必須が埋まらないときは、その値を捏造せず空文字や妥当な空値にし、missing に「項目名」と「短い日本語の質問」を入れる。
- 任意項目(bring/rsvp/fee/guests/cta/links/images等)は、情報が無ければ空配列・null・空文字にする。各PF文面では省略する。
- datetime.start は分かる範囲で "YYYY-MM-DDTHH:mm" 形式。日付が「来週木曜」等で曖昧なら、文脈の基準日が与えられていればそれを使い、無ければ空にして missing に入れる。
- 会場固有の事情（例:「19時に教室が閉まる」）は専用項目を作らず note に入れる。
- body（当日の流れ）は、メモに明示が無くても自然な流れを"提案"してよい。ただし提案したものは assumptions に「(提案) …」として列挙し、勝手に確定した体にしない。
- hook は「今回の推しポイント／来たくなる一文」。意欲喚起の言葉があれば拾う。

# プラットフォーム別の書き分けルール（重要）
すべて日本語。同じ中間JSONから、宛先に合わせて文面を変える。

## line（LINEグループ向け）
- 300〜500字程度・1メッセージで完結。スマホで一目で読める。
- 冒頭に情報ブロック（🗓 日時 / 📍 場所 / 🎒 持ち物）を罫線(━)や空行でまとめ、本文と視覚的に分ける。
- それ以降は見出し付きセクションで区切る（だらだらと一段落にしない）。見出しに絵文字を多用。
- フランクで親しみのあるトーン。
- リンクは末尾にまとめる。

## teams（Teams向け）
- 詳しめでOK。見出し(##/###)＋箇条書き(・)で情報を整理。
- 絵文字は控えめ（見出しアイコン程度）。
- 整然・情報重視のトーン。当日の流れは丁寧に。

## discord（Discord向け）
- Markdown(**太字**・見出し)を活用。中くらいの長さ。
- カジュアルなトーン。絵文字は多め。

# 構成と勧誘力（毎回の標準・全PF共通）
- 情報ブロックを先頭で固める: 「日時 / 場所 / 持ち物」を一塊にし、区切り（罫線・空行・見出し）で本文と分け、一目で要点が分かるようにする。
- セクションを見出しで明確に分ける（例: 🎯 今回やること / 📋 当日の流れ）。情報を平坦に並べず、塊ごとに見出しを付ける。
- メリット訴求を1ブロック加える: 「こんな人に来てほしい」「参加すると何が得られるか（自分のアイデアが形になる/方向性を一緒に決められる/体験できる等）」を、読み手が"自分ごと"として行きたくなるよう書く。
  - ただし summary / hook / メモにある事実から無理なく言える範囲に留め、メリットや対象像を捏造しない。
  - 純粋な内部連絡で勧誘が不要な場合は、メリット訴求は控えめ・省略してよい（やりすぎない）。
- kind="event" は集客・拡散を特に強める。kind="activity" でも新規歓迎や参加意欲を一言添える。

# 出力の原則
- 文面に、入力に無い事実（場所・日時・登壇者など）を捏造しない。
- 必須が欠けていても、分かる範囲でドラフトは作る（欠けた箇所は「（要確認）」等で示す）。
- 必ず compose_broadcast ツール経由でのみ出力する。地の文で返答しない。`;

interface ComposeBody {
  kind?: string;
  rawText?: string;
  json?: unknown;
  instruction?: string;
  today?: string;
  platforms?: string[]; // 生成する配信先（省略時は全PF）
  profile?: {
    circle_name?: string;
    leader_name?: string;
    def_location?: string;
    note?: string;
    style_memo?: string;
  };
  examples?: Array<{ title: string; line: string }>; // 文体学習用 few-shot
}

export function buildUserText(body: ComposeBody): string {
  const kind = body.kind === "event" ? "event" : "activity";
  const today = body.today ? `\n# 今日の日付（曖昧な日付の解決に使う）\n${body.today}\n` : "";

  // 使う配信先の指定（一部だけ使う場合、不要なPFは空文字でよい＝無駄な生成を省く）
  const ALL_PF = ["line", "teams", "discord"];
  const pfList =
    Array.isArray(body.platforms) && body.platforms.length > 0
      ? ALL_PF.filter((p) => body.platforms!.includes(p))
      : ALL_PF;
  const offPF = ALL_PF.filter((p) => !pfList.includes(p));
  const pfNote =
    offPF.length > 0
      ? `\n# 生成する配信先\n${pfList.join(" / ")} のみ作成する。${offPF.join("・")} は使わないので、platforms の該当キーは空文字 "" にしてよい（無理に作らない）。\n`
      : "";

  const p = body.profile;
  const profile =
    p && (p.circle_name || p.leader_name || p.def_location || p.note || p.style_memo)
      ? `\n# サークルプロフィール（告知文に反映する）\n${[
          p.circle_name && `サークル名: ${p.circle_name}`,
          p.leader_name && `担当者名: ${p.leader_name}`,
          p.def_location && `よく使う場所: ${p.def_location}`,
          p.note && `定型補足メモ: ${p.note}`,
          p.style_memo && `文体・トーンの要望: ${p.style_memo}`,
        ]
          .filter(Boolean)
          .join("\n")}\n`
      : "";

  const fewShot =
    body.examples && body.examples.length > 0
      ? `\n# 過去の告知文（文体・絵文字・トーンの参考にする。内容は今回と無関係）\n${body.examples
          .map((e, i) => `【例${i + 1}】${e.title}\n${e.line}`)
          .join("\n\n")}\n`
      : "";

  if (body.instruction && body.json) {
    return `種別: ${kind}${today}${pfNote}${profile}${fewShot}
# 現在の中間JSON
${JSON.stringify(body.json, null, 2)}

# ユーザーの修正指示
${body.instruction}

この指示を反映して中間JSONを更新し、全PF文面を再生成してください。`;
  }

  if (body.json) {
    return `種別: ${kind}${today}${pfNote}${profile}${fewShot}
# 確定済みの中間JSON（内容は尊重し、勝手に変えない）
${JSON.stringify(body.json, null, 2)}

このJSONから全PF文面を生成してください（missing は再評価して返す）。`;
  }

  return `種別: ${kind}${today}${pfNote}${profile}${fewShot}
# ふんわりメモ
${body.rawText ?? ""}

このメモから中間JSONを組み立て、全PF文面を生成してください。`;
}
