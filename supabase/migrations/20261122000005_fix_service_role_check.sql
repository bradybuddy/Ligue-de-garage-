-- Correctif trouvé par les tests : après une transaction qui a fait set_config('request.jwt.claims', …, true),
-- Postgres laisse le réglage à '' (chaîne vide) sur la connexion. ''::jsonb plante → tout déclencheur
-- qui appelait is_service_role() échouait sur une connexion réutilisée (confirmation de courriel, suppression de compte).
create or replace function is_service_role() returns boolean
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'service_role'
$$;
