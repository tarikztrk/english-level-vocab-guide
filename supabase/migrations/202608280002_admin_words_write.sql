create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Allow admins to insert words" on public.words;
drop policy if exists "Allow admins to update words" on public.words;
drop policy if exists "Allow admins to delete words" on public.words;

create policy "Allow admins to insert words"
on public.words
for insert
to authenticated
with check (public.is_admin());

create policy "Allow admins to update words"
on public.words
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Allow admins to delete words"
on public.words
for delete
to authenticated
using (public.is_admin());
