-- After INSERT into organizations, PostgREST tries to SELECT the new row.
-- At that moment the user is not yet in org_members, so is_org_member() = false -> 403.
-- Fix: allow the owner to always read their own organizations.

drop policy if exists "organizations: members can select" on public.organizations;

create policy "organizations: members can select"
  on public.organizations for select
  using (
    owner_id = auth.uid()
    or public.is_org_member(id)
  );
