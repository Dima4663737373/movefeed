-- 1. Create the post_views table
create table if not exists post_views (
  post_id text primary key,
  view_count bigint default 0,
  last_updated timestamptz default now()
);

-- 2. Create the increment function (RPC)
create or replace function increment_view_count(p_post_id text)
returns void
language plpgsql
security definer
as $$
begin
  insert into post_views (post_id, view_count, last_updated)
  values (p_post_id, 1, now())
  on conflict (post_id)
  do update set 
    view_count = post_views.view_count + 1,
    last_updated = now();
end;
$$;

-- 3. (Optional) Enable public access if RLS is on
-- alter table post_views enable row level security;
-- create policy "Public views" on post_views for select using (true);
-- create policy "Public increment" on post_views for insert with check (true);
-- create policy "Public update" on post_views for update using (true);
