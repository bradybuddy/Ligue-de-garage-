-- service_role n'a pas accès à auth.users dans Supabase (et c'est bien).
-- Deux fonctions étroites, réservées au serveur, pour les seuls besoins de l'appli.

-- Compte VÉRIFIÉ qui a ce courriel (pour relier une fiche ajoutée par un gérant)
create or replace function verified_user_id(p_email text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(p_email) and email_confirmed_at is not null limit 1
$$;

-- Profil + courriel d'un utilisateur
create or replace function user_with_email(p_id uuid)
returns table (id uuid, email text, display_name text, phone text, locale text)
language sql stable security definer set search_path = public as $$
  select p.id, u.email::text, p.display_name, p.phone, p.locale from profiles p join auth.users u on u.id = p.id where p.id = p_id
$$;

revoke execute on function verified_user_id(text), user_with_email(uuid) from public, anon, authenticated;
grant execute on function verified_user_id(text), user_with_email(uuid) to service_role;
