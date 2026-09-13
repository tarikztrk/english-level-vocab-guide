-- Optional: renames the seeded English category labels to Turkish so the
-- category chips in the UI match the rest of the (now Turkish) interface.
-- Levels are intentionally left alone: A1-C2 are international CEFR codes.
--
-- Skip this migration if you prefer to keep English category names.

update public.words set category = 'Akademik' where lower(category) = 'academic';
update public.words set category = 'İş' where lower(category) = 'business';
update public.words set category = 'Günlük' where lower(category) in ('daily', 'casual');
update public.words set category = 'Deyimler' where lower(category) = 'idioms';
