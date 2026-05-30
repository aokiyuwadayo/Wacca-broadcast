-- settings テーブルに Discord / Teams の Webhook URL を追加
-- Supabase Dashboard > SQL Editor で実行する

alter table settings
  add column if not exists discord_webhook text not null default '',
  add column if not exists teams_webhook   text not null default '';
