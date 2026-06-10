-- Slack を「告知の配信先PF」として追加するためのマイグレーション。
-- ⚠️ 実行は個人PCから（会社PCでは DB 操作をしない方針）。
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行する。

-- 告知投稿用 Webhook（例: #00_announce 向け）。
-- 既存の slack_webhook は「リマインド通知用」（例: #100_notifications 向け）のまま用途を変えない。
alter table settings
  add column if not exists slack_announce_webhook text not null default '';

-- 予約投稿の platform チェック制約に 'slack' を追加
alter table scheduled_posts
  drop constraint if exists scheduled_posts_platform_check;
alter table scheduled_posts
  add constraint scheduled_posts_platform_check
  check (platform in ('discord', 'teams', 'slack'));
