-- INSERT into org_members fails for the first row because the policy
-- checks existing org_members rows (chicken-and-egg) and is also recursive.
-- Fix: allow if user is the org owner (from organizations table)
-- OR is already an admin (via SECURITY DEFINER to avoid recursion).

create or replace function public.is_org_admin(oid uuid)
returns bool language sql security definer set search_path = public as $$
  select exists (
    select 1 from org_members
    where org_id = oid and user_id = auth.uid()
      and role in ('owner', 'admin')
  )
$$;

drop policy if exists "org_members: org owners/admins can insert" on public.org_members;

create policy "org_members: org owners/admins can insert"
  on public.org_members for insert
  with check (
    -- org owner bootstrapping their first membership row
    exists (
      select 1 from public.organizations
      where id = org_id and owner_id = auth.uid()
    )
    or public.is_org_admin(org_id)
  );
