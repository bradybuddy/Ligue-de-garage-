-- Buddy & Beer — migration 0009 : battement de cœur du cron, pour la page /etat et la surveillance.
-- Aucune donnée personnelle : seulement des heures et des compteurs.

create table if not exists system_heartbeat (
  name text primary key,
  at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);
alter table system_heartbeat enable row level security;
revoke all on system_heartbeat from anon, authenticated;
grant all on system_heartbeat to service_role;

-- État de santé, lisible par le service seulement (la route /api/sante l'expose sans détail personnel).
create or replace function system_health() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'last_tick_at', (select at from system_heartbeat where name = 'tick'),
    'tick_age_seconds', (select extract(epoch from now() - at)::int from system_heartbeat where name = 'tick'),
    'outbox_waiting_over_10_min', (select count(*) from outbox where status in ('pending','sending') and send_after < now() - interval '10 minutes'),
    'outbox_failed_last_hour', (select count(*) from outbox where status = 'failed' and created_at > now() - interval '1 hour')
  );
$$;
revoke execute on function system_health() from public, anon, authenticated;
grant execute on function system_health() to service_role;
