-- ============================================================
-- Trigger: auto-add project creator as admin in project_members.
-- Fixes "0 members" — previously the client-side insert could
-- silently fail if the RLS bootstrap condition wasn't satisfied.
-- Now the DB handles it atomically within the same transaction.
-- ============================================================
create or replace function public.on_project_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is not null then
    insert into public.project_members (project_id, user_id, role)
    values (new.id, v_uid, 'admin')
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger project_creator_becomes_admin
  after insert on public.projects
  for each row execute function public.on_project_created();

-- ============================================================
-- Add project_members to the realtime publication so client
-- subscriptions receive INSERT/UPDATE/DELETE events.
-- ============================================================
alter publication supabase_realtime add table public.project_members;

-- ============================================================
-- Widen the tasks UPDATE policy so all project members can
-- move tasks between columns (drag-and-drop), not only admins
-- or the assigned user.
-- ============================================================
drop policy if exists "tasks: assignee or admin can update" on public.tasks;

create policy "tasks: members can update"
  on public.tasks for update
  using (public.is_project_member(project_id));
