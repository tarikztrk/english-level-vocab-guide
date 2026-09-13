drop policy if exists "Allow admins to read all profiles" on public.profiles;
drop policy if exists "Allow admins to read all user_progress" on public.user_progress;

create policy "Allow admins to read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "Allow admins to read all user_progress"
on public.user_progress
for select
to authenticated
using (public.is_admin());
