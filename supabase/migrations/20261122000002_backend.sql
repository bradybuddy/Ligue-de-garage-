-- Buddy & Beer — migration 0002 : ce qu'il faut pour le vrai backend.
-- 1. profils créés par l'Auth, fiches reliées seulement après vérification du courriel
-- 2. suppression de compte qui supprime vraiment (et anonymise l'historique d'équipe)
-- 3. file d'envoi avec le message rendu
-- 4. set_attendance : source « gérant », pas de saut dans la liste d'attente
-- 5. privilèges : anon n'a accès à rien

-- ───────────── 1. Profils et liaison des fiches ─────────────
-- Relie les fiches créées par un gérant (même courriel) au compte.
-- Seulement quand le courriel est VÉRIFIÉ : sinon n'importe qui pourrait s'inscrire avec
-- le courriel d'un joueur et voir son équipe.
create or replace function link_member_records(p_user uuid, p_email text) returns void
language sql security definer set search_path = public as $$
  update members m set user_id = p_user, joined_at = coalesce(m.joined_at, now())
   where m.user_id is null and m.left_at is null and m.email = p_email::citext
     and not exists (select 1 from members x where x.team_id = m.team_id and x.user_id = p_user);
$$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, phone)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
          nullif(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do nothing;
  if new.email_confirmed_at is not null then
    perform link_member_records(new.id, new.email);
  end if;
  return new;
end $$;

create or replace function handle_user_confirmed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform link_member_records(new.id, new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function handle_user_confirmed();

-- join_team : exiger un courriel vérifié pour relier une fiche existante
create or replace function join_team(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  t uuid; m uuid; em citext; confirmed boolean;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select id into t from teams where invite_code = upper(trim(p_code));
  if t is null then raise exception 'code invalide'; end if;
  select email, email_confirmed_at is not null into em, confirmed from auth.users where id = auth.uid();
  if confirmed then
    update members set user_id = auth.uid(), joined_at = coalesce(joined_at, now())
     where team_id = t and user_id is null and email = em and left_at is null
    returning id into m;
  end if;
  if m is null then
    insert into members (team_id, user_id, display_name, email, class, joined_at)
    values (t, auth.uid(), p_display_name, em, 'spare', now())
    on conflict (team_id, user_id) where user_id is not null do update set left_at = null
    returning id into m;
  end if;
  return m;
end $$;

-- ───────────── 2. Suppression de compte ─────────────
-- Les références « créé par » ne bloquent plus la suppression.
alter table teams alter column created_by drop not null;
alter table teams drop constraint teams_created_by_fkey,
  add constraint teams_created_by_fkey foreign key (created_by) references profiles(id) on delete set null;
alter table leagues alter column owner_id drop not null;
alter table leagues drop constraint leagues_owner_id_fkey,
  add constraint leagues_owner_id_fkey foreign key (owner_id) references profiles(id) on delete set null;
alter table broadcasts alter column author_id drop not null;
alter table broadcasts drop constraint broadcasts_author_id_fkey,
  add constraint broadcasts_author_id_fkey foreign key (author_id) references profiles(id) on delete set null;

-- Avant d'effacer le profil : on anonymise ses fiches d'équipe (stats et frais restent cohérents)
create or replace function anonymize_member_records() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update members set display_name = 'Ancien joueur', email = null, phone = null, sms_opt_in = false, left_at = coalesce(left_at, now())
   where user_id = old.id;
  delete from push_subscriptions where user_id = old.id;
  return old;
end $$;
drop trigger if exists profiles_anonymize on profiles;
create trigger profiles_anonymize before delete on profiles
  for each row execute function anonymize_member_records();

-- ───────────── 3. File d'envoi ─────────────
alter table outbox
  add column to_address text,
  add column subject text,
  add column body text,
  add column provider text;

-- ───────────── 4. Présences ─────────────
drop function if exists create_team(text, text, text);
create or replace function create_team(p_name text, p_sport text, p_display_name text, p_max_players int default 20) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid; em citext; ph text;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select u.email, p.phone into em, ph from auth.users u join profiles p on p.id = u.id where u.id = auth.uid();
  insert into teams (created_by, name, sport, max_players) values (auth.uid(), p_name, p_sport, p_max_players) returning id into t;
  insert into members (team_id, user_id, display_name, email, phone, sms_opt_in, role, joined_at)
  values (t, auth.uid(), p_display_name, em, ph, ph is not null, 'manager', now());
  insert into threads (team_id, kind) values (t, 'team');
  insert into seasons (team_id, name, starts_on)
  values (t, to_char(now(), 'YYYY') || '-' || to_char(now() + interval '1 year', 'YY'), current_date);
  return t;
end $$;

create or replace function set_attendance(
  p_event uuid, p_member uuid, p_status text, p_note text default null, p_source text default 'app'
) returns text
language plpgsql security definer set search_path = public as $$
declare
  ev events%rowtype;
  tm teams%rowtype;
  mb members%rowtype;
  cur attendance%rowtype;
  cap int;
  taken int;
  final_status text := p_status;
  prev text;
  src text := p_source;
begin
  if p_status not in ('in','out') then raise exception 'statut invalide'; end if;

  select * into ev from events where id = p_event for update;      -- verrou : une place, un joueur
  if not found then raise exception 'événement introuvable'; end if;
  select * into tm from teams where id = ev.team_id;
  select * into mb from members where id = p_member and team_id = ev.team_id and left_at is null;
  if not found then raise exception 'membre introuvable'; end if;

  if not (is_service_role() or coalesce(mb.user_id = auth.uid(), false) or is_team_manager(ev.team_id)) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if not is_service_role() and mb.user_id is distinct from auth.uid() then src := 'manager'; end if;
  if ev.status <> 'scheduled' then raise exception 'événement fermé'; end if;

  select * into cur from attendance where event_id = p_event and member_id = p_member;
  prev := coalesce(cur.status, 'no_reply');

  if p_status = 'in' and prev = 'waitlist' then
    final_status := 'waitlist';                    -- pas de saut dans la file
  elsif p_status = 'in' and prev <> 'in' then
    if mb.position = 'goalie' then
      cap := coalesce(ev.max_goalies, tm.max_goalies);
      select count(*) into taken from attendance a join members m on m.id = a.member_id
       where a.event_id = p_event and a.status = 'in' and m.position = 'goalie';
    else
      cap := coalesce(ev.max_players, tm.max_players);
      select count(*) into taken from attendance a join members m on m.id = a.member_id
       where a.event_id = p_event and a.status = 'in' and m.position = 'skater';
    end if;
    if taken >= cap then
      if tm.waitlist_mode = 'off' then raise exception 'complet'; end if;
      final_status := 'waitlist';
    end if;
  end if;

  insert into attendance (event_id, member_id, status, note, source, responded_at, waitlisted_at)
  values (p_event, p_member, final_status, p_note, src, now(), case when final_status = 'waitlist' then now() end)
  on conflict (event_id, member_id) do update
     set status = excluded.status,
         note = coalesce(excluded.note, attendance.note),
         source = excluded.source,
         responded_at = now(),
         waitlisted_at = case when excluded.status = 'waitlist' then coalesce(attendance.waitlisted_at, now()) else null end,
         waitlist_rank = case when excluded.status = 'waitlist' then attendance.waitlist_rank end
  returning * into cur;

  insert into attendance_log (attendance_id, from_status, to_status, source, actor_user_id)
  values (cur.id, prev, final_status, src, auth.uid());

  if p_status = 'out' and prev = 'in' then
    perform on_spot_freed(p_event, p_member);
  end if;
  return final_status;
end $$;

-- ───────────── 5. Privilèges ─────────────
-- anon (visiteur non connecté) : rien. Le site public de la ligue (L08) passera par le serveur.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;
-- Tables réservées au serveur : même pas de privilège de base pour authenticated (en plus du RLS sans policy)
revoke all on outbox, response_tokens, inbound_sms, processed_webhooks from authenticated;
-- La vue standings contourne le RLS (propriétaire postgres) : serveur seulement
revoke all on standings from authenticated;

-- ───────────── Suivi des migrations ─────────────
create table if not exists public.schema_migrations (version text primary key, applied_at timestamptz not null default now());
revoke all on public.schema_migrations from authenticated, anon;
