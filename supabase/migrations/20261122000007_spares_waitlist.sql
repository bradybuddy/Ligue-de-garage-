-- Jalon 2 : spares et liste d'attente (S14, S15).

-- L'ordre manuel du gérant (waitlist_rank) passe avant tout ; sinon réguliers d'abord, puis premier arrivé.
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

  for mgr in select id from members where team_id = tm.id and role in ('manager','assistant') and left_at is null and id <> p_leaver loop
    insert into outbox (member_id, channel, category, template, payload, dedupe_key)
    values (mgr.id, 'push', 'manager_alert', 'player_dropped',
            jsonb_build_object('event_id', p_event, 'member_id', p_leaver),
            'dropped:' || p_event || ':' || p_leaver || ':' || mgr.id || ':' || extract(epoch from clock_timestamp())::bigint)
    on conflict (dedupe_key) do nothing;
  end loop;

  if tm.waitlist_mode = 'top' then
    select a.member_id into next_up
      from attendance a join members m on m.id = a.member_id
     where a.event_id = p_event and a.status = 'waitlist' and m.position = leaver_pos
     order by a.waitlist_rank nulls last, (m.class = 'regular') desc, a.waitlisted_at
     limit 1
     for update of a;
    if next_up is not null then
      update attendance set status = 'in', source = 'auto', responded_at = now(), waitlisted_at = null, waitlist_rank = null
       where event_id = p_event and member_id = next_up;
      insert into outbox (member_id, channel, category, template, payload, dedupe_key)
      values (next_up, 'push', 'waitlist', 'promoted_from_waitlist', jsonb_build_object('event_id', p_event),
              'promoted:' || p_event || ':' || next_up || ':' || extract(epoch from clock_timestamp())::bigint)
      on conflict (dedupe_key) do nothing;
    end if;
  elsif tm.waitlist_mode = 'first_accept' then
    -- Toute la file est avisée ; le premier qui répond IN prend la place (verrou dans set_attendance)
    for w in select a.member_id from attendance a join members m on m.id = a.member_id
              where a.event_id = p_event and a.status = 'waitlist' and m.position = leaver_pos loop
      update attendance set status = 'no_reply', waitlisted_at = null, waitlist_rank = null
       where event_id = p_event and member_id = w.member_id;
      insert into outbox (member_id, channel, category, template, payload, dedupe_key)
      values (w.member_id, 'push', 'waitlist', 'spot_open', jsonb_build_object('event_id', p_event),
              'spot_open:' || p_event || ':' || w.member_id || ':' || extract(epoch from clock_timestamp())::bigint)
      on conflict (dedupe_key) do nothing;
    end loop;
  end if;
end $$;

-- S15 : le gérant accepte quelqu'un, même au-delà du maximum
create or replace function force_in(p_event uuid, p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ev events%rowtype; prev text; att uuid;
begin
  select * into ev from events where id = p_event for update;
  if not found then raise exception 'événement introuvable'; end if;
  if not (is_service_role() or is_team_manager(ev.team_id)) then raise exception 'accès refusé' using errcode = '42501'; end if;
  if ev.status <> 'scheduled' then raise exception 'événement fermé'; end if;
  if not exists (select 1 from members where id = p_member and team_id = ev.team_id and left_at is null) then raise exception 'membre introuvable'; end if;
  select status into prev from attendance where event_id = p_event and member_id = p_member;
  insert into attendance (event_id, member_id, status, source, responded_at)
  values (p_event, p_member, 'in', 'manager', now())
  on conflict (event_id, member_id) do update set status = 'in', source = 'manager', responded_at = now(), waitlisted_at = null, waitlist_rank = null
  returning id into att;
  insert into attendance_log (attendance_id, from_status, to_status, source, actor_user_id) values (att, coalesce(prev, 'no_reply'), 'in', 'manager', auth.uid());
  insert into outbox (member_id, channel, category, template, payload, dedupe_key)
  values (p_member, 'push', 'waitlist', 'promoted_from_waitlist', jsonb_build_object('event_id', p_event),
          'accepted:' || p_event || ':' || p_member || ':' || extract(epoch from clock_timestamp())::bigint)
  on conflict (dedupe_key) do nothing;
end $$;

-- S15 : ordre manuel de la liste d'attente
create or replace function reorder_waitlist(p_event uuid, p_members uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare ev events%rowtype;
begin
  select * into ev from events where id = p_event for update;
  if not found then raise exception 'événement introuvable'; end if;
  if not (is_service_role() or is_team_manager(ev.team_id)) then raise exception 'accès refusé' using errcode = '42501'; end if;
  update attendance a set waitlist_rank = x.ord
    from unnest(p_members) with ordinality as x(member_id, ord)
   where a.event_id = p_event and a.member_id = x.member_id and a.status = 'waitlist';
end $$;

-- Places libres d'un match (joueurs, gardiens)
create or replace function open_spots(p_event uuid) returns table (players int, goalies int)
language sql stable security definer set search_path = public as $$
  select greatest(coalesce(e.max_players, t.max_players) - count(*) filter (where a.status = 'in' and m.position = 'skater'), 0)::int,
         greatest(coalesce(e.max_goalies, t.max_goalies) - count(*) filter (where a.status = 'in' and m.position = 'goalie'), 0)::int
    from events e join teams t on t.id = e.team_id
    left join attendance a on a.event_id = e.id
    left join members m on m.id = a.member_id
   where e.id = p_event
   group by e.max_players, t.max_players, e.max_goalies, t.max_goalies
$$;

revoke execute on function force_in(uuid, uuid), reorder_waitlist(uuid, uuid[]), open_spots(uuid) from public, anon;
grant execute on function force_in(uuid, uuid), reorder_waitlist(uuid, uuid[]), open_spots(uuid) to authenticated, service_role;
