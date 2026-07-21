alter table public.words enable row level security;
alter table public.user_progress enable row level security;

alter table public.user_progress
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.user_progress
drop constraint if exists user_progress_word_id_key;

drop index if exists public.user_progress_user_word_unique;

create unique index user_progress_user_word_unique
on public.user_progress(user_id, word_id);

create or replace function public.set_user_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_progress_updated_at on public.user_progress;

create trigger set_user_progress_updated_at
before update on public.user_progress
for each row
execute function public.set_user_progress_updated_at();

drop policy if exists "Allow public read access to words" on public.words;

create policy "Allow public read access to words"
on public.words
for select
using (true);

drop policy if exists "Allow public read access to user_progress" on public.user_progress;
drop policy if exists "Allow public insert and update access to user_progress" on public.user_progress;
drop policy if exists "Allow public update access to user_progress" on public.user_progress;
drop policy if exists "Allow users to read own progress" on public.user_progress;
drop policy if exists "Allow users to insert own progress" on public.user_progress;
drop policy if exists "Allow users to update own progress" on public.user_progress;

create policy "Allow users to read own progress"
on public.user_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow users to insert own progress"
on public.user_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow users to update own progress"
on public.user_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
