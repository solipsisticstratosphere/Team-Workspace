-- ============================================================
-- Fix 1: projects SELECT
-- After INSERT+select=*, PostgREST reads back the new row.
-- At that moment the user is NOT yet in project_members,
-- so is_project_member(id) = false -> 403.
-- Fix: org members can see all projects in their org.
-- This also makes semantic sense (org members discover projects).
-- ============================================================
drop policy if exists "projects: project members can select" on public.projects;

create policy "projects: org or project members can select"
  on public.projects for select
  using (
    public.is_project_member(id)
    or public.is_org_member(org_id)
  );

-- ============================================================
-- Fix 2: project_members INSERT (chicken-and-egg)
-- get_project_role(project_id) = 'admin' returns null for a brand-new
-- project (no rows in project_members yet) -> check fails -> 403.
-- Fix: allow an org member to add themselves as admin to an org project
-- (bootstrap), OR allow existing project admin to add anyone.
-- ============================================================
drop policy if exists "project_members: admins can insert" on public.project_members;

create policy "project_members: admins can insert"
  on public.project_members for insert
  with check (
    -- bootstrap: org member adding themselves to a project in their org
    (
      user_id = auth.uid()
      and public.is_org_member(
        (select org_id from public.projects where id = project_id)
      )
    )
    -- or existing project admin adding any user
    or public.get_project_role(project_id) = 'admin'
  );

-- ============================================================
-- Fix 3: project_members SELECT after INSERT
-- When addMember() inserts + later fetchMembers() selects,
-- the user must be in project_members to pass is_project_member().
-- That's already true at that point, but also fix the update/delete
-- policies to use SECURITY DEFINER get_project_role (already done).
-- No change needed here — leaving as-is.
-- ============================================================
