create or replace function public.current_volunteer()
returns public.volunteers
language sql
stable
security definer
set search_path = public
as $$
  select v.* from public.volunteers v
  where v.id = (select auth.uid()) and v.is_active = true;
$$;

revoke all on function public.current_volunteer() from public;
grant execute on function public.current_volunteer() to authenticated;

create or replace function public.is_active_volunteer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.volunteers where id = (select auth.uid()) and is_active = true);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.volunteers where id = (select auth.uid()) and is_active = true and role = 'ADMIN');
$$;

revoke all on function public.is_active_volunteer() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_active_volunteer() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.event_config enable row level security;
alter table public.volunteers enable row level security;
alter table public.participants enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.attendance enable row level security;
alter table public.sync_operations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.pass_deliveries enable row level security;

create policy event_config_active_volunteers_read on public.event_config for select to authenticated using (public.is_active_volunteer());
create policy event_config_admin_manage on public.event_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy volunteers_self_read on public.volunteers for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy volunteers_admin_manage on public.volunteers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy participants_active_volunteers_read on public.participants for select to authenticated using (public.is_active_volunteer());
create policy participants_admin_manage on public.participants for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy teams_active_volunteers_read on public.teams for select to authenticated using (public.is_active_volunteer());
create policy teams_active_volunteers_create on public.teams for insert to authenticated with check (public.is_active_volunteer() and created_by = (select auth.uid()));
create policy teams_admin_manage_update on public.teams for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy teams_admin_manage_delete on public.teams for delete to authenticated using (public.is_admin());

create policy team_members_active_volunteers_read on public.team_members for select to authenticated using (public.is_active_volunteer());
create policy team_members_active_volunteers_create on public.team_members for insert to authenticated with check (public.is_active_volunteer() and added_by = (select auth.uid()));
create policy team_members_admin_manage on public.team_members for delete to authenticated using (public.is_admin());

create policy attendance_active_volunteers_read on public.attendance for select to authenticated using (public.is_active_volunteer());
create policy attendance_active_volunteers_create on public.attendance for insert to authenticated with check (public.is_active_volunteer() and recorded_by = (select auth.uid()) and recorded_at <= now());
create policy attendance_admin_manage_update on public.attendance for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy attendance_admin_manage_delete on public.attendance for delete to authenticated using (public.is_admin());

create policy sync_operations_owner_read on public.sync_operations for select to authenticated using (volunteer_id = (select auth.uid()) or public.is_admin());
create policy sync_operations_owner_create on public.sync_operations for insert to authenticated with check (public.is_active_volunteer() and volunteer_id = (select auth.uid()));
create policy sync_operations_admin_manage_update on public.sync_operations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sync_operations_admin_manage_delete on public.sync_operations for delete to authenticated using (public.is_admin());

create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.is_admin());
create policy audit_logs_active_volunteer_create on public.audit_logs for insert to authenticated with check (public.is_active_volunteer() and actor_id = (select auth.uid()));

create policy pass_deliveries_admin_manage on public.pass_deliveries for all to authenticated using (public.is_admin()) with check (public.is_admin());
