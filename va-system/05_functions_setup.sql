-- ============================================================
-- 05_functions_setup.sql
-- Kör i Supabase SQL Editor efter 04_settings.sql
-- ============================================================

-- ── Logg-tabell för Edge Functions ───────────────────────────
create table if not exists function_logs (
  id            uuid primary key default uuid_generate_v4(),
  function_name text not null,
  result        jsonb,
  created_at    timestamptz default now()
);

alter table function_logs enable row level security;

create policy "Admin kan se function_logs"
  on function_logs for select using (is_admin());

-- ── pg_cron: daglig körning av notify-overdue ─────────────────
-- Aktivera pg_cron i Supabase: Dashboard → Database → Extensions → pg_cron

-- OBS: Byt ut URL och secret mot dina faktiska värden
-- Kör detta EFTER att du deployat Edge Functions med `supabase functions deploy`

/*
select cron.schedule(
  'notify-overdue-daily',          -- jobbnamn
  '0 8 * * 1-5',                   -- kl 08:00 måndag–fredag (UTC)
  $$
  select net.http_post(
    url     := 'https://DITT_PROJEKT.supabase.co/functions/v1/notify-overdue',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  current_setting('app.cron_secret')
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);
*/

-- Visa schemalagda jobb:
-- SELECT * FROM cron.job;

-- Ta bort ett jobb:
-- SELECT cron.unschedule('notify-overdue-daily');
