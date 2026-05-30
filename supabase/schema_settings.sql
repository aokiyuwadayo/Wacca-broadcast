-- Wacca Cast: settings テーブル（1行のみ。サークルプロフィール）
-- Supabase Dashboard > SQL Editor で実行する

create table if not exists settings (
  id           uuid primary key default gen_random_uuid(),
  circle_name  text not null default '',
  leader_name  text not null default '',
  def_location text not null default '',
  note         text not null default '',
  updated_at   timestamptz not null default now()
);

alter table settings enable row level security;

create policy "anon can select" on settings for select to anon using (true);
create policy "anon can insert" on settings for insert to anon with check (true);
create policy "anon can update" on settings for update to anon using (true);
