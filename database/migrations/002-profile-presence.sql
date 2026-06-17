-- Profile + presence columns (safe to re-run)
alter table users add column if not exists avatar_url text;
alter table users add column if not exists last_seen_at timestamptz;
