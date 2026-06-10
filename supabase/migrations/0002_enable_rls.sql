-- RLS 有効化（Issue #8 / phase-e-auth-plan.md PR-3）
--
-- ⚠️ 実行前提（順番を守ること。早すぎると認証ユーザーから既存データが見えなくなる）:
--   1. 0001_accounts_memberships.sql 実行済み
--   2. Supabase Auth 有効化済み・青木の auth.users.id で accounts/memberships 作成済み
--   3. 既存行の backfill 済み（0001 末尾コメントの SQL。account_id が null の行は
--      認証ユーザーからは見えなくなるため、有効化前に必ず埋める）
--   4. アプリ側は PR-2（account_id 紐付け）まで main にマージ・デプロイ済み
--
-- 影響範囲の整理:
--   - サーバ各ルート・cron は service_role キー = RLS を**バイパス**するので動作不変。
--     アプリレベルの絞り込みは PR-2 の account_id スコープが担う。
--   - anon キーでのテーブル直読みは全拒否になる（/history はサーバ経由化済みなので影響なし）。
--   - この RLS は「将来 anon/authenticated キーでアクセスする経路」と
--     「Supabase ダッシュボード以外からの直接アクセス」に対する防御層。

-- 0) ヘルパー: 自分が所属する account の id 一覧。
--    memberships のポリシーが memberships 自身を参照すると無限再帰になるため、
--    security definer（= RLS を通らない）関数に切り出す。
create or replace function my_account_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select account_id from memberships where user_id = auth.uid()
$$;

revoke all on function my_account_ids() from public;
grant execute on function my_account_ids() to authenticated;

-- 1) RLS 有効化（既定 deny。policy に合致した操作だけ通る）
alter table accounts           enable row level security;
alter table memberships        enable row level security;
alter table settings           enable row level security;
alter table broadcasts         enable row level security;
alter table scheduled_posts    enable row level security;
alter table regular_schedules  enable row level security;

-- 2) accounts: 所属サークルは読める。更新（名前変更・owner 移譲）は owner のみ。
drop policy if exists accounts_select on accounts;
create policy accounts_select on accounts
  for select to authenticated
  using (id in (select my_account_ids()));

drop policy if exists accounts_update_owner on accounts;
create policy accounts_update_owner on accounts
  for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id is not null);

-- 3) memberships: 同じサークルのメンバー一覧は読める。
--    追加・削除（招待・除名）はそのサークルの owner のみ（PR-4 の UI が使う）。
drop policy if exists memberships_select on memberships;
create policy memberships_select on memberships
  for select to authenticated
  using (account_id in (select my_account_ids()));

drop policy if exists memberships_insert_owner on memberships;
create policy memberships_insert_owner on memberships
  for insert to authenticated
  with check (
    exists (select 1 from accounts a where a.id = account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists memberships_delete_owner on memberships;
create policy memberships_delete_owner on memberships
  for delete to authenticated
  using (
    exists (select 1 from accounts a where a.id = account_id and a.owner_user_id = auth.uid())
  );

-- 4) データ4テーブル: 自分が所属するサークルの行だけ読み書き可
drop policy if exists settings_rw on settings;
create policy settings_rw on settings
  for all to authenticated
  using (account_id in (select my_account_ids()))
  with check (account_id in (select my_account_ids()));

drop policy if exists broadcasts_rw on broadcasts;
create policy broadcasts_rw on broadcasts
  for all to authenticated
  using (account_id in (select my_account_ids()))
  with check (account_id in (select my_account_ids()));

drop policy if exists scheduled_posts_rw on scheduled_posts;
create policy scheduled_posts_rw on scheduled_posts
  for all to authenticated
  using (account_id in (select my_account_ids()))
  with check (account_id in (select my_account_ids()));

drop policy if exists regular_schedules_rw on regular_schedules;
create policy regular_schedules_rw on regular_schedules
  for all to authenticated
  using (account_id in (select my_account_ids()))
  with check (account_id in (select my_account_ids()));

-- 動作確認チェックリスト（実行後）:
--   [ ] service_role 経由のアプリ（生成・保存・/history・cron）が従来どおり動く
--   [ ] anon キーで broadcasts を直 select すると 0 行（拒否）になる
--   [ ] 認証ユーザー（青木）で memberships/accounts が読める
--   [ ] 別メールのテストユーザーからは何も見えない
