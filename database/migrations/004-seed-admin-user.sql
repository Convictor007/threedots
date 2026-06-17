-- Default admin account (username: admin, password: root)
-- Password hash: SHA-256 of "root"
insert into users (
  id,
  username,
  display_name,
  avatar_color,
  password_hash,
  role,
  last_seen_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  'admin',
  'Administrator',
  '#1b4332',
  '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2',
  'admin',
  now()
)
on conflict (username) do update set
  role = 'admin',
  password_hash = excluded.password_hash,
  display_name = excluded.display_name,
  updated_at = now();
