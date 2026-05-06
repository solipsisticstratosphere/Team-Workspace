-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- Organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users not null,
  created_at timestamptz default now()
);

-- Org members
create table public.org_members (
  org_id uuid references public.organizations on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Project members
create table public.project_members (
  project_id uuid references public.projects on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_to uuid references auth.users on delete set null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages (live chat)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- Documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade not null,
  title text not null default 'Untitled',
  content text default '',
  updated_by uuid references auth.users on delete set null,
  is_archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity log
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade,
  user_id uuid references auth.users on delete set null,
  entity_type text check (entity_type in ('task', 'message', 'document', 'member')),
  action text check (action in ('created', 'updated', 'deleted', 'joined', 'left')),
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Trigger: auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: update updated_at on tasks
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at before update on public.tasks
  for each row execute procedure public.set_updated_at();

create trigger documents_updated_at before update on public.documents
  for each row execute procedure public.set_updated_at();

-- Enable realtime on tasks and messages
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.messages;
