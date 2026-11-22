-- Correctif trouvé par les tests : threads_read lisait thread_participants, dont la policy lisait threads
-- → « infinite recursion detected in policy ». Une seule fonction security definer décide pour les deux.
create or replace function can_read_thread(th uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from threads t where t.id = th and t.kind = 'team' and is_team_member(t.team_id))
      or exists (select 1 from thread_participants p join members m on m.id = p.member_id
                 where p.thread_id = th and m.user_id = auth.uid() and m.left_at is null)
$$;
revoke execute on function can_read_thread(uuid) from public, anon;
grant execute on function can_read_thread(uuid) to authenticated, service_role;

drop policy threads_read on threads;
create policy threads_read on threads for select using (can_read_thread(id));
drop policy participants_read on thread_participants;
create policy participants_read on thread_participants for select using (can_read_thread(thread_id));
drop policy messages_read on messages;
create policy messages_read on messages for select using (can_read_thread(thread_id));
drop policy messages_insert on messages;
create policy messages_insert on messages for insert with check (
  can_read_thread(thread_id)
  and exists (select 1 from members m where m.id = author_member_id and m.user_id = auth.uid()
              and m.team_id = team_of_thread(thread_id) and m.left_at is null));
