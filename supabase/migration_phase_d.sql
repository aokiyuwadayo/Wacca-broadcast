-- Phase D: 予約投稿 + 定期スケジュール
-- Supabase Dashboard > SQL Editor で実行する

-- 予約投稿（今日が scheduled_date になったら朝のcronが送信）
create table if not exists scheduled_posts (
  id             uuid primary key default gen_random_uuid(),
  platform       text not null check (platform in ('discord', 'teams')),
  text           text not null,
  scheduled_date date not null,
  status         text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at        timestamptz,
  error          text,
  created_at     timestamptz not null default now()
);
create index if not exists scheduled_posts_date_idx on scheduled_posts (scheduled_date, status);

alter table scheduled_posts enable row level security;
create policy "anon can all" on scheduled_posts for all to anon using (true) with check (true);

-- 定期スケジュール（毎週の活動。cronが指定日数前にSlack通知）
create table if not exists regular_schedules (
  id                 uuid primary key default gen_random_uuid(),
  day_of_week        int  not null check (day_of_week between 0 and 6), -- 0=日 1=月 ... 4=木 ...
  time_str           text not null default '16:30',
  location           text not null default '',
  summary_template   text not null default '',
  remind_days_before int  not null default 2,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

alter table regular_schedules enable row level security;
create policy "anon can all" on regular_schedules for all to anon using (true) with check (true);

-- settings に Slack Webhook URL を追加
alter table settings add column if not exists slack_webhook text not null default '';
