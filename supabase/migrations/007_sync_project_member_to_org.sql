-- When a user is added to a project, auto-add them to the parent org
-- if they're not already a member. This ensures the org appears in their dashboard.

create or replace function public.sync_project_member_to_org()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from public.projects where id = new.project_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, new.user_id, 'member')
  on conflict (org_id, user_id) do nothing;

  return new;
end;
$$;

create trigger on_project_member_added
  after insert on public.project_members
  for each row execute function public.sync_project_member_to_org();
