-- Adds the draft/publish workflow, a grammatical word-type facet (for dedup +
-- filtering) and an append-only change log, so the admin panel can support
-- bulk CSV import, publish gating on required fields, and "who changed what".

alter table public.words
  add column if not exists word_type text,
  add column if not exists status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by_email text;

-- Every word that existed before this migration was already live to students;
-- treat it as published so this migration never hides previously visible words.
update public.words set status = 'published' where status = 'draft';

create index if not exists idx_words_status on public.words (status);

create or replace function public.set_words_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists words_set_updated_at on public.words;

create trigger words_set_updated_at
before update on public.words
for each row
execute function public.set_words_updated_at();

-- Append-only audit trail: who created/edited/published/archived/restored a
-- word and when. No update/delete policy on purpose, so entries can't be
-- rewritten after the fact.
create table if not exists public.word_change_log (
  id bigint generated always as identity primary key,
  word_id bigint references public.words(id) on delete set null,
  word_label text not null,
  action text not null check (action in ('create', 'update', 'publish', 'archive', 'restore', 'import')),
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_email text,
  changed_at timestamptz not null default now(),
  details text
);

alter table public.word_change_log enable row level security;

drop policy if exists "Allow admins to read change log" on public.word_change_log;
drop policy if exists "Allow admins to insert change log" on public.word_change_log;

create policy "Allow admins to read change log"
on public.word_change_log
for select
to authenticated
using (public.is_admin());

create policy "Allow admins to insert change log"
on public.word_change_log
for insert
to authenticated
with check (public.is_admin());
