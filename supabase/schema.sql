-- Wacca Cast: broadcasts テーブル
-- Supabase Dashboard > SQL Editor で実行する

create table if not exists broadcasts (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('activity', 'event')),
  title      text not null,
  json       jsonb not null,
  platforms  jsonb not null,
  created_at timestamptz not null default now()
);

-- 新しい順に取得するインデックス
create index if not exists broadcasts_created_at_idx on broadcasts (created_at desc);

-- anon ロールは読み取り・挿入のみ許可（削除・更新は不要）
alter table broadcasts enable row level security;

create policy "anon can insert" on broadcasts
  for insert to anon with check (true);

create policy "anon can select" on broadcasts
  for select to anon using (true);
