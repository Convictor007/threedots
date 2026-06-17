-- Admin role for user monitoring dashboard
alter table users
  add column if not exists role text not null default 'user';

alter table users
  drop constraint if exists users_role_check;

alter table users
  add constraint users_role_check check (role in ('user', 'admin'));

create index if not exists idx_users_role on users(role);
