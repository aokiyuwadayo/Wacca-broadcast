-- Phase E: 文体学習用フィールドを settings に追加
-- Supabase Dashboard > SQL Editor で実行する

alter table settings
  add column if not exists style_memo text not null default '';
