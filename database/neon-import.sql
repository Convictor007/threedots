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

commit;
