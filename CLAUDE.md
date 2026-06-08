# YUWA Broadcast — プロジェクトガイド（Claude Code 用）

> このファイルは、**どのPCからでも** このリポジトリをクローンした Claude Code セッションが、
> 過去の文脈なしに「今どこにいて・何を・どう続けるか」を掴めるようにするためのもの。
> まず `docs/design-doc.md`（全体設計）と `docs/status-*.md` の最新版を読むこと。

## これは何か

サークルの告知（毎週の活動・単発イベント）を、**ふんわりメモから AI が整え、各プラットフォーム向けに
書き分けて、配信（or コピペ）まで地続きにする**ツール。起業部 部長（青木）の告知業務の負担軽減が出発点で、
将来は他サークルにも開放できる形で設計している。

- 姉妹プロジェクト: [YUWA 本体](https://github.com/aokiyuwadayo/yuwa)（旧コードネーム s-fit）。
  本ツールはスタックを揃えてあり、後で「YUWA の一機能」として吸収できる。

## 方針（決定済み・要点）

- **独立 PO 個人ツールとして先行**。YUWA 本体（ボランティア部員が実装中）に混ぜて負担を増やさない。
- **部員の個人情報は一切扱わない** → YUWA 本体の個人情報・規約リスクと切り離す。
- **マルチテナント前提で設計**：設定・テンプレ・配信先はアカウント（サークル）単位。v1 は青木 1 人。
- **AI / コスト方針**：中央 API キーを **1 個だけサーバー側**に置く。**エンドユーザー（学生）はキー不要**。
  主力モデルは **Haiku 4.5**（1 本数円）。悪用はログイン＋回数制限で防ぐ。各ユーザーにキーを取らせない。
- **配信のリアリティ**：LINE は無料枠が厳しいため**当面コピペ固定**。Teams は Power Automate Workflows、
  Discord は Webhook、Notion は API。詳細は design-doc §8/§12。

## 技術スタック

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v3 + `@anthropic-ai/sdk`
- 将来: Supabase（DB / 認証 / Vault / pg_cron）+ Vercel（PWA）
- 構造化出力は Anthropic の **tool use を強制**して実現（`src/lib/schema.ts` の `compose_broadcast`）

## 開発の進め方（ルール）

- **main への直接 push は禁止**（docs / 本ファイル等の「地図」系を除く）。機能は feature branch → PR。
- **Conventional Commits**（`feat` / `fix` / `docs` / `refactor` / `chore` 等）。
- コミット末尾に Co-Authored-By トレーラを付ける。
- **ロードマップ＝ design-doc §13 の Phase A〜F。1 Phase = 1 PR** を積んでいく。

## ローカルで動かす

```bash
npm install
cp .env.example .env.local      # ANTHROPIC_API_KEY を設定（鍵はここだけ。.gitignore 済）
npm run dev                     # http://localhost:3000
```

## 現在のフェーズ

**Phase A〜E＋スライド生成・画像アップロード・PWA まで実装済**（2026-06-08 時点）。
- A メモ→各PF文面→コピペ / B Supabase保存・履歴・前回複製・運営フォーマット設定 /
  C Discord/Teams自動投稿＋送信前確認＋接続テスト送信 / D 予約投稿・定期下書き・Slackリマインド /
  E 文体学習（few-shot）。F スライド下書き生成も実装済。
- **残りの主要未実装**: Issue #8 の「複数管理者・引き継ぎ」（＝認証が前提）。土台SQL＋プランは
  `docs/phase-e-auth-plan.md` と `supabase/migrations/0001_accounts_memberships.sql` に用意済（コード本体・RLSは個人PCでテストして実装）。
- **個人PC限定の宿題**: B系プロンプト改善（`docs/prompt-improvements-proposal.md`）の実出力検証＆適用、認証の有効化・マイグレーション実行。

最新の詳細・次の一手は `docs/status-2026-06-08.md` を参照（旧 status-2026-05-29/30 は陳腐化）。
