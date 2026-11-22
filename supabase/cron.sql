-- Planifie la tâche /api/cron/tick toutes les 2 minutes avec pg_cron + pg_net (Supabase).
-- À exécuter UNE FOIS dans le SQL Editor de Supabase, après avoir activé les extensions pg_cron et pg_net
-- (Database → Extensions). Remplace les deux valeurs entre < >. Le secret va dans Vault, pas dans le code.

select vault.create_secret('<CRON_SECRET identique à celui de Vercel>', 'cron_secret');

select cron.schedule(
  'buddy-beer-tick',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := '<APP_URL>/api/cron/tick',
    headers := jsonb_build_object(
      'authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'content-type', 'application/json'),
    timeout_milliseconds := 25000
  );
  $$
);

-- Vérifier : select * from cron.job_run_details order by start_time desc limit 10;
-- Réponses HTTP : select status_code, content from net._http_response order by created desc limit 10;
