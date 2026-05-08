-- ============================================================
-- 04_settings.sql  –  Kör efter 02_rls_storage.sql
-- Används för att lagra OneDrive refresh_token m.m.
-- ============================================================

create table if not exists settings (
  key        text not null,
  value      text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz default now(),
  primary key (key, user_id)
);

alter table settings enable row level security;

create policy "Users manage own settings"
  on settings for all using (user_id = auth.uid());

-- Auto-update updated_at
create trigger settings_updated_at
  before update on settings
  for each row execute function set_updated_at();
