-- マルチテナント（複数管理者・引き継ぎ）の土台。Issue #8 / design-doc §10。
--
-- ⚠️ このマイグレーションは「追加専用・非破壊」。既存の稼働中アプリを壊さない範囲だけを入れる。
--    - 新テーブル（accounts / memberships）を作る
--    - 既存テーブルに account_id を「NULL 許容」で足す（既存行はそのまま動く）
--    - RLS は **まだ有効化しない**（認証実装＋テストと一緒に別マイグレーションで入れる）
--
-- なぜ RLS をここで有効化しないか：
--    現状サーバ各ルートは service_role キーで RLS をバイパスするが、
--    /history はクライアントの anon キーで broadcasts を読む。
--    ここで RLS を有効化すると anon の SELECT が拒否され /history が即壊れる。
--    → RLS は「認証導入＋account_id 紐付け＋ポリシー整備」が揃ってから（phase-e-auth-plan.md 参照）。
--
-- 実行は個人PC（Supabase ダッシュボードの SQL Editor もしくは supabase db push）で。
-- 会社PCからは実行しない（鍵/DB操作のガードレール）。

-- 1) サークル（テナント）
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null default '',
  owner_user_id uuid,                       -- auth.users.id。引き継ぎ＝この付け替え
  created_at    timestamptz not null default now()
);

-- 2) 管理者（人 × サークル × 権限）
create table if not exists memberships (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id    uuid not null,                 -- auth.users.id
  role       text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  unique (account_id, user_id)
);
create index if not exists idx_memberships_account on memberships(account_id);
create index if not exists idx_memberships_user    on memberships(user_id);

-- 3) 既存テーブルを account に紐付け（NULL 許容で追加＝既存行はそのまま）
alter table settings           add column if not exists account_id uuid references accounts(id);
alter table broadcasts         add column if not exists account_id uuid references accounts(id);
alter table scheduled_posts    add column if not exists account_id uuid references accounts(id);
alter table regular_schedules  add column if not exists account_id uuid references accounts(id);

create index if not exists idx_settings_account          on settings(account_id);
create index if not exists idx_broadcasts_account        on broadcasts(account_id);
create index if not exists idx_scheduled_posts_account   on scheduled_posts(account_id);
create index if not exists idx_regular_schedules_account on regular_schedules(account_id);

-- 4) v1 データの引き取り（任意・青木1人ぶんを1サークルに寄せる）
--    認証で青木の auth.users.id が分かってから owner_user_id / memberships を埋めるのが正確。
--    まず器だけ作りたい場合は下記をコメントアウトのまま、認証導入後に実行する。
--
-- insert into accounts (name, owner_user_id) values ('福工大 起業部', '<青木のauth.users.id>')
--   returning id;  -- ← この id を控えて既存行に backfill
-- update settings          set account_id = '<上のid>' where account_id is null;
-- update broadcasts        set account_id = '<上のid>' where account_id is null;
-- update scheduled_posts   set account_id = '<上のid>' where account_id is null;
-- update regular_schedules set account_id = '<上のid>' where account_id is null;
