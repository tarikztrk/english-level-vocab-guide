create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Allow users to read own profile" on public.profiles;

create policy "Allow users to read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- No insert/update policy for authenticated users on purpose: role changes
-- are only made manually via the SQL editor (or by the trigger below on
-- signup), so a signed-in user can never grant themselves admin access.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Backfill profile rows for any users created before this migration.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
