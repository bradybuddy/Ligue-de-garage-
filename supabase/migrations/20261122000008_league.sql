-- Couche ligue (L01, L02, L03, L05, L09).
-- Idée centrale : un match de ligue est recopié par déclencheur dans l'horaire des deux équipes (events).
-- Rappels, spares, présences et tournée fonctionnent donc tels quels sur les matchs de ligue.

-- ───────────── Création et équipes ─────────────
create or replace function create_league(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare l uuid; base text;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  base := trim(both '-' from regexp_replace(lower(unaccent_simple(p_name)), '[^a-z0-9]+', '-', 'g'));
  insert into leagues (owner_id, name, slug) values (auth.uid(), trim(p_name), left(coalesce(nullif(base, ''), 'ligue'), 40) || '-' || substr(md5(random()::text), 1, 4))
  returning id into l;
  insert into league_admins (league_id, user_id, role) values (l, auth.uid(), 'owner');
  insert into seasons (league_id, name, starts_on) values (l, to_char(now(), 'YYYY') || '-' || to_char(now() + interval '1 year', 'YY'), current_date);
  return l;
end $$;

-- Sans l'extension unaccent : remplacement des accents courants du français
create or replace function unaccent_simple(s text) returns text language sql immutable as $$
  select translate(s, 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ', 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY')
$$;

-- Rattacher une équipe existante (son gérant a donné le code d'équipe)
create or replace function attach_team_to_league(p_league uuid, p_code text, p_division uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare t teams%rowtype;
begin
  if not is_league_admin(p_league) then raise exception 'accès refusé' using errcode = '42501'; end if;
  select * into t from teams where invite_code = upper(trim(p_code));
  if not found then raise exception 'code invalide'; end if;
  if t.league_id is not null and t.league_id <> p_league then raise exception 'déjà dans une autre ligue'; end if;
  if p_division is not null and not exists (select 1 from divisions where id = p_division and league_id = p_league) then raise exception 'division invalide'; end if;
  update teams set league_id = p_league, division_id = p_division where id = t.id;
  return t.id;
end $$;

-- Créer une équipe directement dans la ligue (ses joueurs la rejoindront avec son code)
create or replace function create_league_team(p_league uuid, p_name text, p_division uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if not is_league_admin(p_league) then raise exception 'accès refusé' using errcode = '42501'; end if;
  if p_division is not null and not exists (select 1 from divisions where id = p_division and league_id = p_league) then raise exception 'division invalide'; end if;
  insert into teams (created_by, name, league_id, division_id) values (auth.uid(), trim(p_name), p_league, p_division) returning id into t;
  insert into threads (team_id, kind) values (t, 'team');
  insert into seasons (team_id, name, starts_on) values (t, to_char(now(), 'YYYY') || '-' || to_char(now() + interval '1 year', 'YY'), current_date);
  return t;
end $$;

-- ───────────── Horaire central → horaire des équipes ─────────────
create or replace function sync_league_game() returns trigger
language plpgsql security definer set search_path = public as $$
declare side record; opp text; season uuid;
begin
  -- Une équipe retirée du match (home/away changé) perd l'événement
  delete from events where league_game_id = new.id and team_id not in (new.home_team_id, new.away_team_id);
  for side in select * from (values (new.home_team_id, new.away_team_id, true), (new.away_team_id, new.home_team_id, false)) as x(team_id, other_id, is_home) loop
    select name into opp from teams where id = side.other_id;
    select id into season from seasons where team_id = side.team_id and is_active;
    insert into events (team_id, season_id, league_game_id, type, starts_at, ends_at, venue, opponent, status, score_us, score_them)
    values (side.team_id, season, new.id, 'game', new.starts_at, new.ends_at, new.venue, opp, new.status,
            case when side.is_home then new.home_score else new.away_score end,
            case when side.is_home then new.away_score else new.home_score end)
    on conflict (team_id, league_game_id) where league_game_id is not null do update set
      starts_at = excluded.starts_at, ends_at = excluded.ends_at, venue = excluded.venue, opponent = excluded.opponent,
      status = excluded.status, score_us = excluded.score_us, score_them = excluded.score_them,
      -- Match déplacé : les rappels et invitations repartent
      reminder_sent_at = case when events.starts_at <> excluded.starts_at and excluded.starts_at > now() then null else events.reminder_sent_at end,
      spares_invited_at = case when events.starts_at <> excluded.starts_at then null else events.spares_invited_at end;
  end loop;
  return new;
end $$;

create or replace function delete_league_game_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from events where league_game_id = old.id;
  return old;
end $$;

drop trigger if exists league_games_sync on league_games;
create trigger league_games_sync after insert or update on league_games for each row execute function sync_league_game();
drop trigger if exists league_games_delete on league_games;
create trigger league_games_delete before delete on league_games for each row execute function delete_league_game_events();

-- Une équipe ne modifie pas un match qui vient de la ligue (il serait écrasé) : seulement ses champs à elle
create or replace function guard_league_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.league_game_id is null or is_service_role() or pg_trigger_depth() > 1 then return new; end if;
  if new.starts_at is distinct from old.starts_at or new.venue is distinct from old.venue or new.opponent is distinct from old.opponent
     or new.status is distinct from old.status or new.score_us is distinct from old.score_us or new.score_them is distinct from old.score_them then
    raise exception 'match de ligue' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists events_guard_league on events;
create trigger events_guard_league before update on events for each row execute function guard_league_event();

-- ───────────── Classement ─────────────
-- La vue standings contourne le RLS : on la sert par une fonction qui vérifie l'accès
create or replace function league_standings(p_league uuid)
returns table (division_id uuid, team_id uuid, team_name text, gp int, w int, l int, t int, otl int, pts int, gf int, ga int)
language sql stable security definer set search_path = public as $$
  select tm.division_id, tm.id, tm.name,
         coalesce(s.gp, 0)::int, coalesce(s.w, 0)::int, coalesce(s.l, 0)::int, coalesce(s.t, 0)::int, coalesce(s.otl, 0)::int,
         coalesce(s.pts, 0)::int, coalesce(s.gf, 0)::int, coalesce(s.ga, 0)::int
    from teams tm
    left join standings s on s.team_id = tm.id and s.league_id = p_league
         and s.season_id is not distinct from (select id from seasons where league_id = p_league and is_active)
   where tm.league_id = p_league
     and (is_service_role() or is_league_admin(p_league) or exists (select 1 from teams x where x.league_id = p_league and is_team_member(x.id)))
   order by tm.division_id, coalesce(s.pts, 0) desc, coalesce(s.w, 0) desc, coalesce(s.gf, 0) - coalesce(s.ga, 0) desc, tm.name
$$;

-- Les matchs de ligue se créent avec la saison active de la ligue
create or replace function league_game_season() returns trigger
language plpgsql as $$
begin
  if new.season_id is null then select id into new.season_id from seasons where league_id = new.league_id and is_active; end if;
  return new;
end $$;
drop trigger if exists league_games_season on league_games;
create trigger league_games_season before insert on league_games for each row execute function league_game_season();

revoke execute on function create_league(text), attach_team_to_league(uuid, text, uuid), create_league_team(uuid, text, uuid), league_standings(uuid) from public, anon;
grant execute on function create_league(text), attach_team_to_league(uuid, text, uuid), create_league_team(uuid, text, uuid), league_standings(uuid) to authenticated, service_role;
