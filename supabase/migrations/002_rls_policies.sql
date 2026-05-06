-- ============================================================
-- Helper function (SECURITY DEFINER so it bypasses RLS itself)
-- ============================================================
create or replace function public.is_project_member(pid uuid)
returns bool language sql security definer set search_path = public as $$
  select exists (
    select 1 from project_members
    where project_id = pid and user_id = auth.uid()
  )
$$;

create or replace function public.get_project_role(pid uuid)
returns text language sql security definer set search_path = public as $$
  select role from project_members
  where project_id = pid and user_id = auth.uid()
  limit 1
$$;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.activity_log enable row level security;

-- ============================================================
-- profiles
-- ============================================================
create policy "profiles: own read/write"
  on public.profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Any authenticated user can read profiles (for showing names/avatars)
create policy "profiles: read by authenticated"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- organizations
-- ============================================================
create policy "organizations: members can select"
  on public.organizations for select
  using (
    exists (
      select 1 from public.org_members
      where org_id = id and user_id = auth.uid()
    )
  );

create policy "organizations: owner can insert"
  on public.organizations for insert
  with check (owner_id = auth.uid());

create policy "organizations: owner can update"
  on public.organizations for update
  using (owner_id = auth.uid());

create policy "organizations: owner can delete"
  on public.organizations for delete
  using (owner_id = auth.uid());

-- ============================================================
-- org_members
-- ============================================================
create policy "org_members: members can select"
  on public.org_members for select
  using (
    exists (
      select 1 from public.org_members om
      where om.org_id = org_id and om.user_id = auth.uid()
    )
  );

create policy "org_members: org owners/admins can insert"
  on public.org_members for insert
  with check (
    exists (
      select 1 from public.org_members om
      where om.org_id = org_id and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
  );

create policy "org_members: self can delete (leave)"
  on public.org_members for delete
  using (user_id = auth.uid());

-- ============================================================
-- projects
-- ============================================================
create policy "projects: project members can select"
  on public.projects for select
  using (public.is_project_member(id));

create policy "projects: org members can insert"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.org_members
      where org_id = projects.org_id and user_id = auth.uid()
    )
  );

create policy "projects: admins can update"
  on public.projects for update
  using (public.get_project_role(id) = 'admin');

create policy "projects: admins can delete"
  on public.projects for delete
  using (public.get_project_role(id) = 'admin');

-- ============================================================
-- project_members
-- ============================================================
create policy "project_members: members can select"
  on public.project_members for select
  using (public.is_project_member(project_id));

create policy "project_members: admins can insert"
  on public.project_members for insert
  with check (public.get_project_role(project_id) = 'admin');

create policy "project_members: admins can update role"
  on public.project_members for update
  using (public.get_project_role(project_id) = 'admin');

create policy "project_members: admins or self can delete"
  on public.project_members for delete
  using (
    user_id = auth.uid()
    or public.get_project_role(project_id) = 'admin'
  );

-- ============================================================
-- tasks
-- SELECT: project members only
-- INSERT: project members only
-- UPDATE: assignee OR project admin
-- DELETE: project admin only
-- ============================================================
create policy "tasks: project members can select"
  on public.tasks for select
  using (public.is_project_member(project_id));

create policy "tasks: project members can insert"
  on public.tasks for insert
  with check (public.is_project_member(project_id));

create policy "tasks: assignee or admin can update"
  on public.tasks for update
  using (
    assigned_to = auth.uid()
    or public.get_project_role(project_id) = 'admin'
  );

create policy "tasks: admins can delete"
  on public.tasks for delete
  using (public.get_project_role(project_id) = 'admin');

-- ============================================================
-- messages
-- SELECT: project members only
-- INSERT: must be member + own user_id
-- ============================================================
create policy "messages: project members can select"
  on public.messages for select
  using (public.is_project_member(project_id));

create policy "messages: members can insert own"
  on public.messages for insert
  with check (
    user_id = auth.uid()
    and public.is_project_member(project_id)
  );

create policy "messages: own delete"
  on public.messages for delete
  using (user_id = auth.uid());

-- ============================================================
-- documents
-- UPDATE: project member AND NOT is_archived
-- ============================================================
create policy "documents: project members can select"
  on public.documents for select
  using (public.is_project_member(project_id));

create policy "documents: project members can insert"
  on public.documents for insert
  with check (public.is_project_member(project_id));

create policy "documents: members can update if not archived"
  on public.documents for update
  using (
    public.is_project_member(project_id)
    and not is_archived
  );

create policy "documents: admins can delete"
  on public.documents for delete
  using (public.get_project_role(project_id) = 'admin');

-- ============================================================
-- activity_log
-- ============================================================
create policy "activity_log: project members can select"
  on public.activity_log for select
  using (public.is_project_member(project_id));

create policy "activity_log: members can insert own"
  on public.activity_log for insert
  with check (
    user_id = auth.uid()
    and public.is_project_member(project_id)
  );
