-- Rejoindre par code (S03) : la personne entre comme RÉGULIER (elle reçoit les rappels tout de suite ;
-- le gérant peut la passer en spare). Aperçu de l'équipe pour quelqu'un qui n'en fait pas encore partie.
create or replace function join_team(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  t uuid; m uuid; em citext; confirmed boolean; ph text;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select id into t from teams where invite_code = upper(trim(p_code));
  if t is null then raise exception 'code invalide'; end if;
  select u.email, u.email_confirmed_at is not null, p.phone into em, confirmed, ph
    from auth.users u join profiles p on p.id = u.id where u.id = auth.uid();
  select id into m from members where team_id = t and user_id = auth.uid() and left_at is null;
  if m is not null then return m; end if;                    -- déjà dans l'équipe
  if confirmed then
    update members set user_id = auth.uid(), joined_at = coalesce(joined_at, now())
     where team_id = t and user_id is null and email = em and left_at is null
    returning id into m;
  end if;
  if m is null then
    insert into members (team_id, user_id, display_name, email, phone, sms_opt_in, class, joined_at)
    values (t, auth.uid(), p_display_name, em, ph, ph is not null, 'regular', now())
    on conflict (team_id, user_id) where user_id is not null do update set left_at = null, joined_at = now()
    returning id into m;
  end if;
  return m;
end $$;

-- Nom et sport seulement : rien d'autre ne fuit vers quelqu'un qui a le code
create or replace function invite_preview(p_code text) returns table (team_id uuid, name text, sport text, players int)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.sport, (select count(*)::int from members m where m.team_id = t.id and m.left_at is null)
    from teams t where t.invite_code = upper(trim(p_code))
$$;
revoke execute on function invite_preview(text) from public, anon;
grant execute on function invite_preview(text) to authenticated, service_role;
