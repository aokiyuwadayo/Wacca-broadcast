# S-FIT（起業部）Slack への導入ランブック

> **目的**: Wacca Cast の告知配信先として、S-FIT の Slack ワークスペースを接続する。
> **前提**: Slack 配信PF対応（schema/prompts/UI/post/cron + `migration_add_slack_announce.sql`）が main にマージ済みであること。
> **⚠️ 作業PC**: Webhook 作成・マイグレーション実行・Vercel 操作は**個人PC**で行う（会社PCでは鍵・個人ログイン・DB操作をしない方針）。

## Slack 側のチャンネル設計（2026-06-10 時点）

| チャンネル | 用途 | Wacca Cast との関係 |
|---|---|---|
| `#00_announce` | 運営が確認した正式な全体告知 | **告知投稿用 Webhook** の宛先 |
| `#100_notifications` | 自動通知の集約（Outlook/Teams 転送など） | **リマインド通知用 Webhook** の宛先 |
| `#99_admin` | 運営の相談・判断 | 接続しない |
| `#98_test` | テスト用 | 動作確認時の一時 Webhook 宛先に使ってよい |

※ Outlook/Teams → Slack の転送は Power Automate 側で構築済み（Wacca Cast とは独立）。

## 手順（個人PCで実施）

### 1. Slack Incoming Webhook を 2 本作る

1. https://api.slack.com/apps → **Create New App** → From scratch → 名前は `Wacca Cast`、ワークスペースは S-FIT を選択
2. **Incoming Webhooks** → On
3. **Add New Webhook to Workspace** を 2 回：
   - 1 本目: 宛先 `#00_announce` → これが **告知投稿用**
   - 2 本目: 宛先 `#100_notifications` → これが **リマインド通知用**
4. それぞれの `https://hooks.slack.com/services/...` URL を控える
   - プライベートチャンネルを宛先にする場合は、そのチャンネルに Wacca Cast アプリを `/invite` しておく

### 2. DB マイグレーションを実行

Supabase ダッシュボード → SQL Editor で `supabase/migration_add_slack_announce.sql` を実行する。
（`settings.slack_announce_webhook` 追加 + `scheduled_posts` の platform 制約に `slack` を追加）

### 3. Wacca Cast の設定画面で Webhook を登録

1. デプロイ済みの Wacca Cast を開く → ⚙️ 設定
2. **Slack Webhook URL（告知投稿用）** に 1 本目の URL を入力 → **テスト送信** → `#00_announce` に届くことを確認
3. **Slack Webhook URL（リマインド通知用）** に 2 本目の URL を入力 → **テスト送信** → `#100_notifications` に届くことを確認
4. 保存

> テスト送信が成功するまで「接続済み」と見なさないこと（silent fail 防止の鉄則）。
> いきなり `#00_announce` に流すのが不安なら、まず `#98_test` 向け Webhook で一巡してから差し替える。

### 4. 動作確認（最初の1本）

1. トップでふんわりメモから生成 → **Slack タブ**に文面が出ることを確認（mrkdwn: `*太字*`、`##` 見出しなし）
2. 「📤 今すぐ送信」→ 確認モーダル → 送信 → `#00_announce` に投稿されることを確認
3. 「📅 予約」も1件作り、翌朝8時（JST）の cron で送信されること・結果通知が `#100_notifications` に来ることを確認

## 未デプロイの場合（参考）

Vercel デプロイ手順は [`docs/deploy.md`](deploy.md) を参照（個人 Vercel + 個人 ANTHROPIC_API_KEY + `SITE_PASSWORD` 必須）。

## トラブルシュート

- **設定の保存が 500 で失敗**: 手順2のマイグレーション未実行（`slack_announce_webhook` カラムが無い）。
- **テスト送信が 404/403**: Webhook URL の貼り間違い、またはアプリが宛先チャンネルに参加していない。
- **予約投稿が `failed` / 「Webhook URL 未設定」**: 告知投稿用（`slack_announce_webhook`）が空のまま。リマインド用とは別欄なので注意。
