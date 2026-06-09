# プロンプト改善案（個人PCで実出力検証してから適用）

> **作成日**: 2026-06-08
> **状態**: 提案のみ。`src/lib/prompts.ts` には**未適用**。
> **なぜ未適用か**: プロンプトの良し悪しは実出力でしか判断できない。会社PCには
> Anthropic 鍵を置かない方針のため、ここでは案だけ用意し、適用と判断は青木が個人PCで行う。

## 検証のやり方（個人PC・鍵あり）

```bash
git clone https://github.com/aokiyuwadayo/Wacca-broadcast.git   # or git pull
cd Wacca-broadcast && npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
npm run dev   # http://localhost:3000
```

立花祭メモ（design-doc §14 の実例）で生成し、下記チェックリストで before/after を見比べる。
良ければ該当の差分を `prompts.ts` に適用してコミット。ダメなら案を捨てるか調整。

---

## B1. 曖昧な相対日付を「具体的な日付」に解決させる

### 現状の弱さ
`buildUserText` は基準日（`today`）をプロンプトに渡しているが、`SYSTEM` の指示は
「基準日が与えられていればそれを使い」程度。「来週木曜」→ 具体的な `YYYY-MM-DD` への
**解決を明示的に要求していない**。結果、`datetime.start` が曖昧なまま返ることがある。

### 提案する差分（`src/lib/prompts.ts` の SYSTEM 内、datetime の行を置換）
```diff
- - datetime.start は分かる範囲で "YYYY-MM-DDTHH:mm" 形式。日付が「来週木曜」等で曖昧なら、文脈の基準日が与えられていればそれを使い、無ければ空にして missing に入れる。
+ - datetime.start は "YYYY-MM-DDTHH:mm" 形式。「来週木曜」「明後日」等の相対表現は、与えられた『今日の日付』を基準に具体的な日付へ必ず解決する。
+   - 解決したら、その旨を assumptions に「(日付) 来週木曜 → 2026-06-11 と解釈」のように1行で残す（ユーザーが取り違いに気付けるように）。
+   - 基準日が無く解決できない曖昧表現のときだけ、datetime.start を空にして missing に入れる。
```

### チェックリスト
- [ ] 「来週木曜 16:30」+ today=2026-06-08 → `datetime.start` が `2026-06-11T16:30` になる
- [ ] assumptions に「(日付) …」が1行入る
- [ ] today を渡さず「来週木曜」だけ → missing に日付の質問が入る（解決を捏造しない）

---

## B2. LINE は 300〜500字を“守らせる”

### 現状の弱さ
SYSTEM は「300〜500字程度」と書くが、超過/不足の**自己チェックを要求していない**。
実測で 500字を大きく超える / 200字未満で薄い、が起きうる。
（UI 側は本PRで範囲外を amber 警告するようにしたが、生成自体は未制御）

### 提案する差分（`## line` セクションの末尾に追記）
```diff
  ## line（LINEグループ向け）
  - 300〜500字程度・1メッセージで完結。スマホで一目で読める。
  ...
  - リンクは末尾にまとめる。
+ - 出力前に文字数を自己点検する。500字を超えたら情報ブロック以外を削って収める。
+   200字を下回るほど薄いときは、メリット訴求やhookを1ブロック足して密度を上げる。
+   （改行・絵文字も字数に含めて数える）
```

### チェックリスト
- [ ] 情報量の多いイベントメモ → LINE が 500字以内に収まる
- [ ] 一言だけの薄いメモ → LINE が極端に短く（200字未満で）ならない
- [ ] 収めるために日時・場所などの必須情報が落ちていない

---

## （保留）ブランド名の統一について

`SYSTEM` 冒頭は **Wacca Cast** に統一済み。今後、関連名を変える際は次の3層を混同しない:

1. **ブランド自己名称**: `prompts.ts` SYSTEM・README・CLAUDE.md・design-doc タイトル → Wacca Cast
2. **姉妹アプリ "YUWA"**（変えない）: サークル管理本体。`github.com/aokiyuwadayo/yuwa`、「YUWA に吸収」等はそのまま
3. **リポ/インフラ名 `wacca-broadcast`**: GitHub リポ名・`package.json` name・Vercel URL
