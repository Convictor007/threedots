-- Neon import SQL for ThreeDots / VerdantMind
-- Run this whole script in Neon SQL Editor.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type message_type as enum ('text', 'image', 'voice');
  end if;
end $$;

create table if not exists users (
  id text primary key,
  username text not null unique,
  display_name text not null,
  avatar_color text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id text primary key,
  updated_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id text not null references conversations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references conversations(id) on delete cascade,
  sender_id text not null references users(id) on delete cascade,
  type message_type not null default 'text',
  content text not null,
  media_url text,
  duration integer,
  created_at timestamptz not null default now(),
  constraint voice_duration_check check (
    (type = 'voice' and duration is not null and duration >= 0) or
    (type <> 'voice' and duration is null)
  ),
  constraint media_required_for_non_text check (
    (type = 'text' and media_url is null) or
    (type in ('image', 'voice') and media_url is not null)
  )
);

create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_messages_conversation_created_at on messages(conversation_id, created_at);
create index if not exists idx_conversation_participants_user_id on conversation_participants(user_id);

-- Seed users from current app defaults:
-- jenalyn / nyenye
-- dr.xiao / xiao
insert into users (id, username, display_name, avatar_color, password_hash)
values
  (
    'user-jenalyn',
    'jenalyn',
    'Jenalyn',
    '#52b788',
    '30566151d239b03909fe93326d7ad769712e31c186bcecc29af949a1b1f7dcc0'
  ),
  (
    'user-drxiao',
    'dr.xiao',
    'Dr. Xiao',
    '#2d6a4f',
    '6941ce7bf0dc5b77b3c8876e8018830b67c60474f9ee3de608e27b390873fe31'
  )
on conflict (id) do update
set
  username = excluded.username,
  display_name = excluded.display_name,
  avatar_color = excluded.avatar_color,
  password_hash = excluded.password_hash,
  updated_at = now();

insert into conversations (id, updated_at)
values ('conv-jenalyn-drxiao', now())
on conflict (id) do nothing;

insert into conversation_participants (conversation_id, user_id)
values
  ('conv-jenalyn-drxiao', 'user-jenalyn'),
  ('conv-jenalyn-drxiao', 'user-drxiao')
on conflict (conversation_id, user_id) do nothing;

insert into messages (conversation_id, sender_id, type, content, created_at)
values
  (
    'conv-jenalyn-drxiao',
    'user-drxiao',
    'text',
    'Good morning! How did your meditation session go yesterday?',
    now() - interval '4 hour'
  ),
  (
    'conv-jenalyn-drxiao',
    'user-jenalyn',
    'text',
    'Really peaceful. I slept so much better after it.',
    now() - interval '3 hour 35 minute'
  ),
  (
    'conv-jenalyn-drxiao',
    'user-drxiao',
    'text',
    'Wonderful. Remember to stay hydrated today as well.',
    now() - interval '3 hour 10 minute'
  ),
  (
    'conv-jenalyn-drxiao',
    'user-jenalyn',
    'text',
    'Will do! Can we talk later about my wellness plan?',
    now() - interval '2 hour 45 minute'
  )
on conflict do nothing;

update conversations c
set updated_at = latest.latest_time
from (
  select conversation_id, max(created_at) as latest_time
  from messages
  group by conversation_id
) latest
where c.id = latest.conversation_id;

commit;
