
-- Enable UUID extension if not exists
create extension if not exists "uuid-ossp";

-- 1. POST MEDIA
create table if not exists post_media (
  id uuid default uuid_generate_v4() primary key,
  post_ref text not null,
  url text not null,
  type text not null,
  created_at timestamptz default now()
);

alter table post_media enable row level security;

drop policy if exists "Public Read Media" on post_media;
create policy "Public Read Media" on post_media for select to anon using (true);

drop policy if exists "Public Insert Media" on post_media;
create policy "Public Insert Media" on post_media for insert to anon with check (true);

-- 2. POST METADATA
create table if not exists post_metadata (
  post_ref text primary key,
  repost_of text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table post_metadata enable row level security;

drop policy if exists "Public Read Metadata" on post_metadata;
create policy "Public Read Metadata" on post_metadata for select to anon using (true);

drop policy if exists "Public Insert Metadata" on post_metadata;
create policy "Public Insert Metadata" on post_metadata for insert to anon with check (true);

-- 3. USER SETTINGS
create table if not exists user_settings (
  user_address text primary key,
  notifications_enabled boolean default true,
  email_notifications boolean default false,
  privacy_mode boolean default false,
  language text default 'en',
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;

drop policy if exists "Public Read Settings" on user_settings;
create policy "Public Read Settings" on user_settings for select to anon using (true);

drop policy if exists "Public Update Settings" on user_settings;
create policy "Public Update Settings" on user_settings for all to anon using (true) with check (true);

-- 4. NOTIFICATIONS
create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  user_address text not null,
  message text not null,
  type text default 'info',
  created_at timestamptz default now(),
  read boolean default false
);

alter table notifications enable row level security;

drop policy if exists "Public Read Notifications" on notifications;
create policy "Public Read Notifications" on notifications for select to anon using (true);

drop policy if exists "Public Insert Notifications" on notifications;
create policy "Public Insert Notifications" on notifications for insert to anon with check (true);

-- 5. MESSAGES (Chat)
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  sender text not null,
  receiver text not null,
  content text not null,
  timestamp bigint not null,
  read boolean default false,
  created_at timestamptz default now()
);

alter table messages enable row level security;

drop policy if exists "Public Read Messages" on messages;
create policy "Public Read Messages" on messages for select to anon using (true);

drop policy if exists "Public Insert Messages" on messages;
create policy "Public Insert Messages" on messages for insert to anon with check (true);

drop policy if exists "Public Update Messages" on messages;
create policy "Public Update Messages" on messages for update to anon using (true);
