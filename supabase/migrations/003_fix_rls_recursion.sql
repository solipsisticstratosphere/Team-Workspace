-- Fix: org_members SELECT policy was self-referencing (infinite recursion -> 500)
-- Solution: SECURITY DEFINER function that bypasses RLS when checking membership

-- Helper for org membership (mirrors is_project_member pattern)
create or replace function public.is_org_member(oid uuid)
returns bool language sql security definer set search_path = public as $$
  select exists (
    select 1 from org_members
    where org_id = oid and user_id = auth.uid()
  )
$$;

-- Drop recursive policy on org_members
drop policy if exists "org_members: members can select" on public.org_members;

-- Replace with non-recursive version using SECURITY DEFINER function
create policy "org_members: members can select"
  on public.org_members for select
  using (public.is_org_member(org_id));

-- Also update organizations select to use same function (was also querying org_members directly)
drop policy if exists "organizations: members can select" on public.organizations;

create policy "organizations: members can select"
  on public.organizations for select
  using (public.is_org_member(id));
