-- Buddy & Beer — schéma V1 (migration 0001)
-- Postgres 15+ sur Supabase (région ca-central-1). Accès : RLS partout.
-- Heures en timestamptz (UTC). Argent en cents entiers + devise.
-- Les écritures sensibles (présences, liste d'attente, envois) passent par
-- des fonctions SQL `security definer` pour régler les courses en BD.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ─────────────────────────────────────────────────────────────
-- Utilitaires
-- ─────────────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function is_service_role() returns boolean
language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role'
$$;

-- Code lisible pour rejoindre une équipe (sans 0/O/1/I)
create or replace function gen_code(len int default 6) returns text
language plpgsql volatile as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
begin
  for i in 1..len loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return out;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Utilisateurs
-- ─────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  phone text,                                   -- E.164, ex. +15145551234
  locale text not null default 'fr-CA' check (locale in ('fr-CA','en-CA')),
  timezone text not null default 'America/Toronto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_failure_at timestamptz
);
create index on push_subscriptions (user_id);

-- ─────────────────────────────────────────────────────────────
-- Ligue
-- ─────────────────────────────────────────────────────────────
create table leagues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete restrict,
  name text not null,
  slug citext not null unique,                  -- site public (V2)
  tagline text,
  logo_path text,
  timezone text not null default 'America/Toronto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on leagues (owner_id);
create trigger leagues_updated before update on leagues
  for each row execute function set_updated_at();

create table league_admins (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner','admin','scorekeeper')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id)
);
create index on league_admins (user_id);

create table divisions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, name)
);
create index on divisions (league_id);

-- ─────────────────────────────────────────────────────────────
-- Équipe et alignement
-- ─────────────────────────────────────────────────────────────
create table teams (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id) on delete restrict,
  name text not null,
  sport text not null default 'hockey' check (sport in ('hockey','dek','ringuette','soccer','balle','autre')),
  league_id uuid references leagues(id) on delete set null,
  division_id uuid references divisions(id) on delete set null,
  invite_code text not null unique default gen_code(6),
  timezone text not null default 'America/Toronto',
  -- Réglages (S25)
  max_players int not null default 20 check (max_players between 1 and 60),
  max_goalies int not null default 2 check (max_goalies between 0 and 6),
  reminder_hours_before int not null default 48 check (reminder_hours_before between 1 and 336),
  second_reminder_hours_before int check (second_reminder_hours_before between 1 and 336),
  auto_spares_enabled boolean not null default true,
  auto_spares_hours_before int not null default 36 check (auto_spares_hours_before between 1 and 336),
  auto_spares_channels text[] not null default '{push,sms,email}'
    check (auto_spares_channels <@ array['push','sms','email']),
  waitlist_mode text not null default 'top' check (waitlist_mode in ('off','top','first_accept')),
  beer_enabled boolean not null default true,
  beer_tiebreak text not null default 'alpha' check (beer_tiebreak in ('alpha','jersey')),
  spare_fee_cents int check (spare_fee_cents >= 0),
  currency char(3) not null default 'CAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on teams (created_by);
create index on teams (league_id);
create index on teams (division_id);
create trigger teams_updated before update on teams
  for each row execute function set_updated_at();

create table seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  league_id uuid references leagues(id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint season_owner check ((team_id is null) <> (league_id is null)),
  constraint season_dates check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index on seasons (team_id);
create index on seasons (league_id);
create unique index one_active_season_per_team on seasons (team_id) where is_active and team_id is not null;
create unique index one_active_season_per_league on seasons (league_id) where is_active and league_id is not null;

-- Un membre peut exister SANS compte : le gérant l'ajoute avec courriel/texto,
-- il répond par lien ou par Y/N. user_id se remplit quand il crée son compte.
create table members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  display_name text not null,
  email citext,
  phone text,                                   -- E.164
  class text not null default 'regular'
    check (class in ('regular','spare','spectator','staff','vacation','injured','suspended')),
  role text not null default 'member' check (role in ('manager','assistant','member')),
  position text not null default 'skater' check (position in ('skater','goalie')),
  jersey_number int check (jersey_number between 0 and 99),
  skill_rank int check (skill_rank between 1 and 10),
  beer_opt_out boolean not null default false,
  sms_opt_in boolean not null default false,    -- consentement explicite (LCAP/CASL)
  sms_opted_out_at timestamptz,                 -- STOP reçu de Twilio
  calendar_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on members (team_id, class);
create index on members (user_id);
create index on members (phone);
create unique index members_team_user on members (team_id, user_id) where user_id is not null;
create unique index members_team_email on members (team_id, email) where email is not null;
create trigger members_updated before update on members
  for each row execute function set_updated_at();

-- Préférences d'avis par catégorie et par canal (fix : « 67 courriels/semaine »)
create table notification_prefs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  category text not null check (category in
    ('reminder','spare_invite','waitlist','beer','chat','broadcast','manager_alert','fees')),
  channel text not null check (channel in ('push','sms','email')),
  enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, category, channel)
);

-- ─────────────────────────────────────────────────────────────
-- Horaire
-- ─────────────────────────────────────────────────────────────
create table league_games (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  season_id uuid references seasons(id) on delete set null,
  division_id uuid references divisions(id) on delete set null,
  home_team_id uuid not null references teams(id) on delete restrict,
  away_team_id uuid not null references teams(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','final')),
  home_score int check (home_score >= 0),
  away_score int check (away_score >= 0),
  overtime boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distinct_teams check (home_team_id <> away_team_id),
  constraint final_has_score check (status <> 'final' or (home_score is not null and away_score is not null))
);
create index on league_games (league_id, starts_at);
create index on league_games (season_id);
create index on league_games (division_id);
create index on league_games (home_team_id);
create index on league_games (away_team_id);
create trigger league_games_updated before update on league_games
  for each row execute function set_updated_at();

create table events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  season_id uuid references seasons(id) on delete set null,
  league_game_id uuid references league_games(id) on delete set null,
  type text not null default 'game' check (type in ('game','practice','other')),
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  opponent text,
  home_room text,
  away_room text,
  max_players int check (max_players between 1 and 60),     -- null = réglage de l'équipe
  max_goalies int check (max_goalies between 0 and 6),
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','final')),
  score_us int check (score_us >= 0),
  score_them int check (score_them >= 0),
  -- marqueurs d'envoi (idempotence des tâches planifiées)
  reminder_sent_at timestamptz,
  second_reminder_sent_at timestamptz,
  spares_invited_at timestamptz,
  beer_assigned_at timestamptz,
  external_uid text,                             -- import ICS / CSV (dédoublonnage)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_times check (ends_at is null or ends_at > starts_at)
);
create index on events (team_id, starts_at);
create index on events (season_id);
create index on events (league_game_id);
create index on events (starts_at) where status = 'scheduled';
create unique index events_team_external on events (team_id, external_uid) where external_uid is not null;
create unique index events_team_league_game on events (team_id, league_game_id) where league_game_id is not null;
create trigger events_updated before update on events
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Présences (le cœur) — liste d'attente incluse dans la même table
-- ─────────────────────────────────────────────────────────────
create table attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null default 'no_reply' check (status in ('in','out','waitlist','no_reply')),
  note text check (char_length(note) <= 280),
  source text check (source in ('app','email','sms','push','manager','auto')),
  responded_at timestamptz,
  waitlisted_at timestamptz,
  waitlist_rank numeric,                         -- réordonnancement manuel (S15)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, member_id),
  constraint waitlist_has_time check (status <> 'waitlist' or waitlisted_at is not null)
);
create index on attendance (member_id);
create index on attendance (event_id, status);
create trigger attendance_updated before update on attendance
  for each row execute function set_updated_at();

create table attendance_log (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendance(id) on delete cascade,
  from_status text,
  to_status text not null,
  source text,
  actor_user_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on attendance_log (attendance_id, created_at);

-- Jetons de réponse par courriel / texto (le joueur sans compte répond quand même)
create table response_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  channel text not null check (channel in ('email','sms')),
  token_hash text not null unique,               -- sha256 du jeton du lien courriel
  sms_code text,                                 -- ex. « 482 » pour départager « Y 482 »
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on response_tokens (member_id, expires_at);
create index on response_tokens (event_id);

create table spare_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  invited_by uuid references profiles(id) on delete set null,  -- null = auto
  channel text not null check (channel in ('push','sms','email')),
  message text,
  is_auto boolean not null default false,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, member_id, channel)          -- jamais deux fois la même invitation
);
create index on spare_invites (member_id);

-- ─────────────────────────────────────────────────────────────
-- Tournée (bière)
-- ─────────────────────────────────────────────────────────────
create table beer_turns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references events(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  mode text not null default 'auto' check (mode in ('auto','manual')),
  drinks_count int check (drinks_count >= 0),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on beer_turns (member_id);

-- ─────────────────────────────────────────────────────────────
-- Communication (« La chambre »)
-- ─────────────────────────────────────────────────────────────
create table threads (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  kind text not null check (kind in ('team','direct')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);
create index on threads (team_id, last_message_at desc);
create unique index one_team_thread on threads (team_id) where kind = 'team';

create table thread_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  last_read_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thread_id, member_id)
);
create index on thread_participants (member_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  author_member_id uuid references members(id) on delete set null,
  body text check (char_length(body) <= 4000),
  gif_url text,
  media_path text,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_not_empty check (body is not null or gif_url is not null or media_path is not null)
);
create index on messages (thread_id, created_at desc);
create index on messages (author_member_id);

-- Une ligne par réaction : tous les noms s'affichent (plainte relevée dans les avis publics)
create table message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 16),
  created_at timestamptz not null default now(),
  unique (message_id, member_id, emoji)
);
create index on message_reactions (member_id);

create table broadcasts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  league_id uuid references leagues(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete restrict,
  channels text[] not null check (channels <@ array['push','sms','email'] and cardinality(channels) > 0),
  audience text[] not null default '{regular,spare}',   -- classes visées
  subject text,
  body text not null check (char_length(body) <= 4000),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint broadcast_owner check ((team_id is null) <> (league_id is null))
);
create index on broadcasts (team_id, created_at desc);
create index on broadcasts (league_id, created_at desc);
create index on broadcasts (author_id);

-- ─────────────────────────────────────────────────────────────
-- File d'envoi (courriel, texto, push) — une seule porte de sortie
-- ─────────────────────────────────────────────────────────────
create table outbox (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  channel text not null check (channel in ('push','sms','email')),
  category text not null,
  template text not null,
  payload jsonb not null default '{}',
  dedupe_key text not null unique,               -- ex. reminder:<event>:<member>:sms
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped')),
  attempts int not null default 0,
  send_after timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outbox_target check (member_id is not null or user_id is not null)
);
create index on outbox (status, send_after);
create index on outbox (member_id);
create index on outbox (user_id);
create index on outbox (provider_message_id);

-- Textos entrants (Twilio) : journal brut + idempotence
create table inbound_sms (
  id uuid primary key default gen_random_uuid(),
  provider_sid text not null unique,
  from_phone text not null,
  body text not null,
  matched_token_id uuid references response_tokens(id) on delete set null,
  result text,
  created_at timestamptz not null default now()
);
create index on inbound_sms (from_phone, created_at desc);

-- Webhooks déjà traités (Stripe, Twilio statut, Resend) — ils arrivent deux fois
create table processed_webhooks (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- ─────────────────────────────────────────────────────────────
-- Frais (should — migration incluse, écrans au jalon 3)
-- ─────────────────────────────────────────────────────────────
create table fees (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  member_id uuid not null references members(id) on delete restrict,
  event_id uuid references events(id) on delete set null,     -- frais de spare
  kind text not null check (kind in ('season','spare','registration','other')),
  label text not null,
  amount_cents int not null check (amount_cents >= 0),
  currency char(3) not null default 'CAD',
  due_on date,
  status text not null default 'due' check (status in ('due','paid','waived')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on fees (team_id, status);
create index on fees (member_id);
create index on fees (event_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  fee_id uuid not null references fees(id) on delete restrict,
  provider text not null default 'manual' check (provider in ('manual','stripe','interac')),
  provider_ref text unique,                      -- checkout session / payment intent
  amount_cents int not null check (amount_cents > 0),
  currency char(3) not null default 'CAD',
  refunded_cents int not null default 0 check (refunded_cents >= 0),
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on payments (fee_id);

-- ─────────────────────────────────────────────────────────────
-- Autorisations (helpers RLS)
-- ─────────────────────────────────────────────────────────────
create or replace function is_team_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m
                 where m.team_id = t and m.user_id = auth.uid() and m.left_at is null)
$$;

create or replace function is_team_manager(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m
                 where m.team_id = t and m.user_id = auth.uid()
                   and m.role in ('manager','assistant') and m.left_at is null)
     or exists (select 1 from teams tm join league_admins la on la.league_id = tm.league_id
                where tm.id = t and la.user_id = auth.uid())
$$;

create or replace function is_league_admin(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from league_admins la where la.league_id = l and la.user_id = auth.uid())
$$;

create or replace function team_of_event(e uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from events where id = e
$$;

create or replace function team_of_thread(th uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from threads where id = th
$$;

-- ─────────────────────────────────────────────────────────────
-- Présences : la seule façon d'écrire un statut
-- Verrouille l'événement → pas de 21e joueur quand le max est 20.
-- ─────────────────────────────────────────────────────────────
create or replace function set_attendance(
  p_event uuid, p_member uuid, p_status text, p_note text default null, p_source text default 'app'
) returns text                                    -- statut final (peut être 'waitlist')
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
begin
  if p_status not in ('in','out') then raise exception 'statut invalide'; end if;

  select * into ev from events where id = p_event for update;      -- verrou
  if not found then raise exception 'événement introuvable'; end if;
  select * into tm from teams where id = ev.team_id;
  select * into mb from members where id = p_member and team_id = ev.team_id;
  if not found then raise exception 'membre introuvable'; end if;

  if not (is_service_role() or coalesce(mb.user_id = auth.uid(), false) or is_team_manager(ev.team_id)) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if ev.status <> 'scheduled' then raise exception 'événement fermé'; end if;

  select * into cur from attendance where event_id = p_event and member_id = p_member;
  prev := cur.status;

  if p_status = 'in' and coalesce(cur.status, '') <> 'in' then
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
  elsif p_status = 'in' then
    final_status := 'in';                          -- déjà IN : on garde sa place
  end if;

  insert into attendance (event_id, member_id, status, note, source, responded_at, waitlisted_at)
  values (p_event, p_member, final_status, p_note, p_source, now(),
          case when final_status = 'waitlist' then now() end)
  on conflict (event_id, member_id) do update
     set status = excluded.status,
         note = coalesce(excluded.note, attendance.note),
         source = excluded.source,
         responded_at = now(),
         waitlisted_at = case when excluded.status = 'waitlist'
                              then coalesce(attendance.waitlisted_at, now()) else null end,
         waitlist_rank = case when excluded.status = 'waitlist' then attendance.waitlist_rank end
  returning * into cur;

  insert into attendance_log (attendance_id, from_status, to_status, source, actor_user_id)
  values (cur.id, prev, final_status, p_source, auth.uid());

  -- IN → OUT : avertir le gérant et libérer une place
  if p_status = 'out' and prev = 'in' then
    perform on_spot_freed(p_event, p_member);
  end if;

  return final_status;
end $$;

-- Libère une place : avis gérant + liste d'attente auto selon le mode
create or replace function on_spot_freed(p_event uuid, p_leaver uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev events%rowtype;
  tm teams%rowtype;
  next_up uuid;
  leaver_pos text;
  mgr record;
  w record;
begin
  select * into ev from events where id = p_event;
  select * into tm from teams where id = ev.team_id;
  select position into leaver_pos from members where id = p_leaver;

  -- avis aux gérants (catégorie manager_alert ; l'envoi respecte notification_prefs)
  for mgr in select id from members where team_id = tm.id and role in ('manager','assistant') and left_at is null loop
    insert into outbox (member_id, channel, category, template, payload, dedupe_key)
    values (mgr.id, 'push', 'manager_alert', 'player_dropped',
            jsonb_build_object('event_id', p_event, 'member_id', p_leaver),
            'dropped:' || p_event || ':' || p_leaver || ':' || mgr.id || ':' || extract(epoch from now())::bigint)
    on conflict (dedupe_key) do nothing;
  end loop;

  if tm.waitlist_mode = 'top' then
    -- réguliers avant spares, puis rang manuel, puis ordre d'arrivée
    select a.member_id into next_up
      from attendance a join members m on m.id = a.member_id
     where a.event_id = p_event and a.status = 'waitlist' and m.position = leaver_pos
     order by (m.class = 'regular') desc, a.waitlist_rank nulls last, a.waitlisted_at
     limit 1
     for update of a;
    if next_up is not null then
      update attendance set status = 'in', source = 'auto', responded_at = now(),
                            waitlisted_at = null, waitlist_rank = null
       where event_id = p_event and member_id = next_up;
      insert into outbox (member_id, channel, category, template, payload, dedupe_key)
      values (next_up, 'push', 'waitlist', 'promoted_from_waitlist',
              jsonb_build_object('event_id', p_event),
              'promoted:' || p_event || ':' || next_up)
      on conflict (dedupe_key) do nothing;
    end if;
  elsif tm.waitlist_mode = 'first_accept' then
    -- tout le monde sur la liste est invité ; le premier qui fait « IN » passe (set_attendance)
    for w in select a.member_id from attendance a join members m on m.id = a.member_id
              where a.event_id = p_event and a.status = 'waitlist' and m.position = leaver_pos loop
      update attendance set status = 'no_reply', waitlisted_at = null
       where event_id = p_event and member_id = w.member_id;
      insert into outbox (member_id, channel, category, template, payload, dedupe_key)
      values (w.member_id, 'push', 'waitlist', 'spot_open',
              jsonb_build_object('event_id', p_event),
              'spot_open:' || p_event || ':' || w.member_id || ':' || extract(epoch from now())::bigint)
      on conflict (dedupe_key) do nothing;
    end loop;
  end if;
end $$;

-- Tournée : le joueur IN qui a apporté le moins souvent cette saison
create or replace function pick_beer(p_event uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ev events%rowtype;
  tm teams%rowtype;
  chosen uuid;
begin
  select * into ev from events where id = p_event for update;
  select * into tm from teams where id = ev.team_id;
  if not tm.beer_enabled or exists (select 1 from beer_turns where event_id = p_event) then
    return (select member_id from beer_turns where event_id = p_event);
  end if;

  select m.id into chosen
    from attendance a
    join members m on m.id = a.member_id
    left join lateral (
      select count(*) n from beer_turns b join events e on e.id = b.event_id
       where b.member_id = m.id and e.team_id = tm.id
         and e.season_id is not distinct from ev.season_id
    ) c on true
   where a.event_id = p_event and a.status = 'in' and not m.beer_opt_out
     and m.class in ('regular','spare')
   order by c.n,
            case when tm.beer_tiebreak = 'jersey' then m.jersey_number end nulls last,
            m.display_name collate "C"
   limit 1;

  insert into beer_turns (event_id, member_id, mode) values (p_event, chosen, 'auto');
  update events set beer_assigned_at = now() where id = p_event;
  if chosen is not null then
    insert into outbox (member_id, channel, category, template, payload, dedupe_key)
    values (chosen, 'push', 'beer', 'beer_duty', jsonb_build_object('event_id', p_event),
            'beer:' || p_event)
    on conflict (dedupe_key) do nothing;
  end if;
  return chosen;
end $$;

-- Rejoindre une équipe par code (S03)
create or replace function join_team(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  t uuid;
  m uuid;
  em citext;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select id into t from teams where invite_code = upper(trim(p_code));
  if t is null then raise exception 'code invalide'; end if;
  select email into em from auth.users where id = auth.uid();

  -- relier une fiche créée par le gérant avec le même courriel
  update members set user_id = auth.uid(), joined_at = coalesce(joined_at, now())
   where team_id = t and user_id is null and email = em
  returning id into m;
  if m is null then
    insert into members (team_id, user_id, display_name, email, class, joined_at)
    values (t, auth.uid(), p_display_name, em, 'spare', now())
    on conflict (team_id, user_id) where user_id is not null do update set left_at = null
    returning id into m;
  end if;
  return m;
end $$;

-- Créer une équipe : le créateur devient gérant, fil d'équipe et saison créés
create or replace function create_team(p_name text, p_sport text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid; em citext;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select email into em from auth.users where id = auth.uid();
  insert into teams (created_by, name, sport) values (auth.uid(), p_name, p_sport) returning id into t;
  insert into members (team_id, user_id, display_name, email, role, joined_at)
  values (t, auth.uid(), p_display_name, em, 'manager', now());
  insert into threads (team_id, kind) values (t, 'team');
  insert into seasons (team_id, name, starts_on) values (t, to_char(now(), 'YYYY') || '-' || to_char(now() + interval '1 year', 'YY'), current_date);
  return t;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Classement (vue) — L05
-- ─────────────────────────────────────────────────────────────
create or replace view standings as
with r as (
  select league_id, season_id, division_id, home_team_id team_id,
         home_score gf, away_score ga, overtime from league_games where status = 'final'
  union all
  select league_id, season_id, division_id, away_team_id,
         away_score, home_score, overtime from league_games where status = 'final'
)
select league_id, season_id, division_id, team_id,
       count(*) gp,
       count(*) filter (where gf > ga) w,
       count(*) filter (where gf < ga and not overtime) l,
       count(*) filter (where gf = ga) t,
       count(*) filter (where gf < ga and overtime) otl,
       2 * count(*) filter (where gf > ga) + count(*) filter (where gf = ga or (gf < ga and overtime)) pts,
       sum(gf) gf, sum(ga) ga
from r group by league_id, season_id, division_id, team_id;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table push_subscriptions enable row level security;
alter table leagues enable row level security;
alter table league_admins enable row level security;
alter table divisions enable row level security;
alter table teams enable row level security;
alter table seasons enable row level security;
alter table members enable row level security;
alter table notification_prefs enable row level security;
alter table league_games enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;
alter table attendance_log enable row level security;
alter table response_tokens enable row level security;   -- aucune policy : service seulement
alter table spare_invites enable row level security;
alter table beer_turns enable row level security;
alter table threads enable row level security;
alter table thread_participants enable row level security;
alter table messages enable row level security;
alter table message_reactions enable row level security;
alter table broadcasts enable row level security;
alter table outbox enable row level security;            -- service seulement
alter table inbound_sms enable row level security;       -- service seulement
alter table processed_webhooks enable row level security;-- service seulement
alter table fees enable row level security;
alter table payments enable row level security;

-- profils : soi-même ; coéquipiers en lecture
create policy profiles_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_teammates on profiles for select using (
  exists (select 1 from members a join members b on a.team_id = b.team_id
          where a.user_id = auth.uid() and b.user_id = profiles.id));

create policy push_self on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ligue
create policy leagues_read on leagues for select using (
  is_league_admin(id) or exists (select 1 from teams t where t.league_id = leagues.id and is_team_member(t.id)));
create policy leagues_insert on leagues for insert with check (owner_id = auth.uid());
create policy leagues_update on leagues for update using (is_league_admin(id));
create policy league_admins_read on league_admins for select using (is_league_admin(league_id));
create policy league_admins_write on league_admins for all using (
  exists (select 1 from leagues l where l.id = league_id and l.owner_id = auth.uid()));
create policy divisions_read on divisions for select using (
  is_league_admin(league_id) or exists (select 1 from teams t where t.league_id = divisions.league_id and is_team_member(t.id)));
create policy divisions_write on divisions for all using (is_league_admin(league_id)) with check (is_league_admin(league_id));
create policy league_games_read on league_games for select using (
  is_league_admin(league_id) or is_team_member(home_team_id) or is_team_member(away_team_id));
create policy league_games_write on league_games for all using (is_league_admin(league_id)) with check (is_league_admin(league_id));

-- équipe (création via create_team())
create policy teams_read on teams for select using (is_team_member(id) or is_team_manager(id));
create policy teams_update on teams for update using (is_team_manager(id)) with check (is_team_manager(id));
create policy teams_delete on teams for delete using (created_by = auth.uid());

create policy seasons_read on seasons for select using (
  (team_id is not null and is_team_member(team_id)) or (league_id is not null and is_league_admin(league_id)));
create policy seasons_write on seasons for all using (
  (team_id is not null and is_team_manager(team_id)) or (league_id is not null and is_league_admin(league_id)));

create policy members_read on members for select using (is_team_member(team_id) or is_team_manager(team_id));
create policy members_manage on members for all using (is_team_manager(team_id)) with check (is_team_manager(team_id));
create policy members_self_update on members for update using (user_id = auth.uid())
  with check (user_id = auth.uid());   -- colonnes sensibles (role, class) protégées par trigger ci-dessous

create or replace function members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_service_role() or is_team_manager(new.team_id) then return new; end if;
  if new.role <> old.role or new.class <> old.class or new.team_id <> old.team_id
     or new.skill_rank is distinct from old.skill_rank then
    raise exception 'seul le gérant peut changer ça' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger members_guard before update on members for each row execute function members_guard();

create policy prefs_self on notification_prefs for all using (
  exists (select 1 from members m where m.id = member_id and m.user_id = auth.uid()))
  with check (exists (select 1 from members m where m.id = member_id and m.user_id = auth.uid()));

create policy events_read on events for select using (is_team_member(team_id) or is_team_manager(team_id));
create policy events_write on events for all using (is_team_manager(team_id)) with check (is_team_manager(team_id));

-- présences : lecture équipe ; écriture seulement via set_attendance()
create policy attendance_read on attendance for select using (is_team_member(team_of_event(event_id)));
create policy attendance_manager_rank on attendance for update using (is_team_manager(team_of_event(event_id)));
create policy attendance_log_read on attendance_log for select using (
  exists (select 1 from attendance a where a.id = attendance_id and is_team_manager(team_of_event(a.event_id))));

create policy spare_invites_read on spare_invites for select using (is_team_manager(team_of_event(event_id)));
create policy beer_read on beer_turns for select using (is_team_member(team_of_event(event_id)));
create policy beer_write on beer_turns for all using (is_team_manager(team_of_event(event_id)))
  with check (is_team_manager(team_of_event(event_id)));

create policy threads_read on threads for select using (
  (kind = 'team' and is_team_member(team_id))
  or exists (select 1 from thread_participants p join members m on m.id = p.member_id
             where p.thread_id = threads.id and m.user_id = auth.uid()));
create policy participants_read on thread_participants for select using (
  exists (select 1 from threads t where t.id = thread_id));   -- hérite de threads_read
create policy participants_self on thread_participants for update using (
  exists (select 1 from members m where m.id = member_id and m.user_id = auth.uid()));

create policy messages_read on messages for select using (
  exists (select 1 from threads t where t.id = thread_id));   -- hérite de threads_read
create policy messages_insert on messages for insert with check (
  exists (select 1 from threads t where t.id = thread_id)
  and exists (select 1 from members m where m.id = author_member_id and m.user_id = auth.uid()
              and m.team_id = team_of_thread(thread_id)));
create policy messages_edit_own on messages for update using (
  exists (select 1 from members m where m.id = author_member_id and m.user_id = auth.uid()));

create policy reactions_read on message_reactions for select using (
  exists (select 1 from messages x where x.id = message_id));
create policy reactions_own on message_reactions for all using (
  exists (select 1 from members m where m.id = member_id and m.user_id = auth.uid()))
  with check (exists (select 1 from members m where m.id = member_id and m.user_id = auth.uid())
              and exists (select 1 from messages x where x.id = message_id));

create policy broadcasts_read on broadcasts for select using (
  (team_id is not null and is_team_member(team_id)) or (league_id is not null and is_league_admin(league_id)));
create policy broadcasts_insert on broadcasts for insert with check (
  author_id = auth.uid() and
  ((team_id is not null and is_team_manager(team_id)) or (league_id is not null and is_league_admin(league_id))));

create policy fees_read on fees for select using (
  is_team_manager(team_id) or exists (select 1 from members m where m.id = member_id and m.user_id = auth.uid()));
create policy fees_write on fees for all using (is_team_manager(team_id)) with check (is_team_manager(team_id));
create policy payments_read on payments for select using (
  exists (select 1 from fees f where f.id = fee_id and
          (is_team_manager(f.team_id) or exists (select 1 from members m where m.id = f.member_id and m.user_id = auth.uid()))));
create policy payments_manual on payments for insert with check (
  provider = 'manual' and exists (select 1 from fees f where f.id = fee_id and is_team_manager(f.team_id)));

-- Realtime : présences et chat
alter publication supabase_realtime add table attendance, messages, message_reactions;
